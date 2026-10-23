# TODO: Inbox Triage — filtrowanie DM przy skali 500k followersów

**Cel:** Przy koncie 500k subów spodziewamy 500–50 000 DM/dzień (głównie reakcje story i emoji).
Główna funkcja aplikacji w warstwie messaging to **NIE wysyłanie**, lecz **filtrowanie i priorytetyzacja**
przychodzących wiadomości — żeby admin zobaczył business inquiries / collab requests / realne pytania
fanów, a nie tonął w morzu „❤️" i „😂".

To jest też kluczowe dla App Review: ten use-case (defensywny inbox triage) Meta zatwierdza.
Kategorycznie inny od „chatbot marketingowy", który Meta blokuje.

---

## Stan aktualny (audyt kodu, 2026-05-06)

| Komponent | Status | Plik |
|---|---|---|
| Webhook receiver | ✅ działa, sygnatura weryfikowana | `app/api/webhook/instagram/route.ts` |
| Storage konwersacji | ✅ tabela `instagram_conversations` | `supabase/migrations/20260127010000_instagram_messaging.sql` |
| Storage wiadomości | ✅ tabela `instagram_messages` | (jw.) |
| Templates | ✅ tabela `message_templates` z `trigger_keywords` | (jw.) — ale **nieużywane w kodzie** |
| Inbox UI | ✅ podstawowy widok | `app/[locale]/admin/dm-inbox/page.tsx` |
| Wysyłka 1:1 | ✅ z `messaging_type: 'RESPONSE'` | `lib/instagram/messages.ts:174` |
| **Klasyfikacja przy odbiorze** | ❌ brak | — |
| **Priorytetyzacja** | ❌ brak | — |
| **Agregacja reakcji** | ❌ brak | — |
| **Filtry/zakładki w UI** | ❌ brak | — |

---

## Faza 1 — Schema dla klasyfikacji (MVP, ~1 dzień)

Nowa migracja: `supabase/migrations/<timestamp>_message_classification.sql`

```sql
-- Klasyfikacja per wiadomość
ALTER TABLE public.instagram_messages
    ADD COLUMN category text,                  -- 'reaction' | 'story_reply' | 'business' | 'fan_question' | 'collab' | 'spam' | 'low_value' | 'media_only' | 'unclassified'
    ADD COLUMN priority smallint DEFAULT 0,    -- 0 (lowest) — 5 (urgent)
    ADD COLUMN classification_method text,     -- 'rule' | 'ai' | 'user_override' | null
    ADD COLUMN classification_metadata jsonb,  -- { model, version, score, reasoning, keywords_matched }
    ADD COLUMN classified_at timestamptz;

CREATE INDEX idx_messages_category_priority
    ON public.instagram_messages(conversation_id, category, priority DESC, created_at DESC);

-- Agregaty per konwersacja (denormalizowane dla wydajności)
ALTER TABLE public.instagram_conversations
    ADD COLUMN top_priority smallint DEFAULT 0,        -- max(priority) z aktywnych wiadomości
    ADD COLUMN top_category text,                      -- kategoria najnowszej non-reaction wiadomości
    ADD COLUMN reaction_count int DEFAULT 0,           -- ile reakcji w konwersacji
    ADD COLUMN business_message_count int DEFAULT 0,   -- ile wiadomości biznesowych
    ADD COLUMN is_starred boolean DEFAULT false,       -- ręczne oznaczenie ważne
    ADD COLUMN is_archived boolean DEFAULT false,      -- ręczne archiwum (różne od is_active)
    ADD COLUMN snooze_until timestamptz;               -- ukryj do daty

CREATE INDEX idx_conversations_priority_inbox
    ON public.instagram_conversations(user_id, is_archived, top_priority DESC, last_message_at DESC);

-- Słownik keywordów (dynamiczny, edytowalny przez admina)
CREATE TABLE public.message_classification_keywords (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES next_auth.users(id) ON DELETE CASCADE,
    keyword text NOT NULL,
    language text DEFAULT 'pl',                  -- 'pl' | 'en'
    category text NOT NULL,                      -- mapuje na category na message
    weight smallint DEFAULT 3,                   -- jak mocno podbija priority
    created_at timestamptz DEFAULT now()
);
CREATE INDEX idx_keywords_user_lang ON public.message_classification_keywords(user_id, language);

-- Sender enrichment cache (raz na nadawcę, TTL 7 dni)
CREATE TABLE public.instagram_participants (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES next_auth.users(id) ON DELETE CASCADE,
    participant_ig_id text NOT NULL,
    username text,
    follower_count int,
    is_verified boolean,
    is_following_us boolean,
    sender_score smallint DEFAULT 0,             -- jakość nadawcy 0-100 (followers, verified, history)
    last_enriched_at timestamptz,
    UNIQUE(user_id, participant_ig_id)
);
```

**RLS i grants — wzorować na istniejącej migracji `20260127010000_instagram_messaging.sql`.**

---

## Faza 2 — Klasyfikator regułowy (fast-path, ~2 dni)

**Plik:** `lib/instagram/classifier-rules.ts` (nowy)

Funkcja `classifyByRules(message, conversation, sender)` zwraca:
```ts
{
  category: Category,
  priority: 0..5,
  method: 'rule',
  metadata: { rule_id, matched_keywords?, score }
} | null  // null = wymaga AI
```

**Reguły (kolejność = priorytet wykrywania):**

- [ ] **R1 — Reaction-only**
  - `message_type === 'text'` AND treść po `.trim()` to wyłącznie 1–3 emoji bez słów → `category: 'reaction'`, `priority: 0`
  - Lista emoji: `^[\p{Emoji_Presentation}\p{Extended_Pictographic}\s]{1,8}$` (regex unicode)

- [ ] **R2 — Story reply**
  - `message_type === 'story_reply'` (już rozpoznawane w webhook handler:182) → `category: 'story_reply'`, `priority: 1` (lub 2 jeśli ma tekst > 10 znaków)

- [ ] **R3 — Media-only bez tekstu**
  - `message_text === null` AND `attachments` non-empty → `category: 'media_only'`, `priority: 1`

- [ ] **R4 — Single short word**
  - długość ≤ 5 znaków AND nie pasuje do keywordów → `category: 'low_value'`, `priority: 0`
  - typowo: „ok", „lol", „xd", „cool"

- [ ] **R5 — Business keyword match**
  - tekst zawiera słowo z `message_classification_keywords` o `category='business'` lub `'collab'`
  - **Domyślne keywordy PL** (seed migration):
    `współpraca, kontakt biznesowy, oferta, sponsor, reklama, ambasador, barter, media kit, press, prasa, redakcja, agencja, marka, kampania, briefing, wycena, stawka, faktura, B2B`
  - **Domyślne keywordy EN**:
    `collab, collaboration, partnership, sponsor, brand, ambassador, media kit, press, business, inquiry, rate card, paid promotion, ad rate, commercial`
  - → `category: 'business'`, `priority: 4` (lub 5 jeśli sender_score > 70 lub `is_verified`)

- [ ] **R6 — Spam/scam keyword match**
  - `crypto, nft, investment opportunity, become rich, click here, free followers, mutual follow, follow back, F4F` etc.
  - → `category: 'spam'`, `priority: 0`

- [ ] **R7 — Repeat sender same text (anti-bot)**
  - jeśli ta sama treść wysłana z >5 różnych `sender_ig_id` w ostatnie 24h → `category: 'spam'`
  - wymaga query agregującego — można async w cronie, nie w hot-path webhook

- [ ] **R8 — Default: unclassified**
  - jeśli żadna reguła → wymaga AI (lub manualnej klasyfikacji)

**Jednostkowe testy:** `__tests__/unit/instagram/classifier-rules.test.ts`
Min. 1 test per regułę + edge cases (pusty tekst, sam whitespace, mieszany emoji+tekst).

---

## Faza 3 — Integracja z webhookiem (~1 dzień)

**Plik:** `app/api/webhook/instagram/route.ts` (modyfikacja)

W `processMessagingEvent` po `insert` do `instagram_messages`:

- [ ] Po insertcie wywołaj `await classifyAndUpdate(messageRow, conversation, userId)`
- [ ] `classifyAndUpdate`:
  1. Pobierz/cache enrichment nadawcy (jeśli stale > 7 dni → fetch z IG API → update `instagram_participants`)
  2. Wywołaj `classifyByRules(...)` 
  3. Jeśli wynik != null → UPDATE `instagram_messages` z `category, priority, classification_method='rule'`
  4. Jeśli wynik == null AND priorytet wstępny ≥ 2 → enqueue do AI classification (Faza 4)
  5. Update agregatów na `instagram_conversations` (`top_priority`, `top_category`, counters)
- [ ] **WAŻNE — webhook timing:** webhook musi odpowiedzieć Meta w < 5s. Jeśli klasyfikacja przekracza:
  - Synchroniczna część: tylko fast-path reguły (< 50ms)
  - AI classification: enqueue do Vercel Queue / Supabase realtime channel / cron job „classify-pending"
  - **Webhook zwraca 200 natychmiast po fast-path**

---

## Faza 4 — Klasyfikator AI (slow-path, ~2 dni)

**Plik:** `lib/instagram/classifier-ai.ts` (nowy)

Dla wiadomości oznaczonych `unclassified` z priorytetem wstępnym ≥ 2:

- [ ] Cron job `app/api/cron/classify-messages/route.ts` (co 5 min)
- [ ] Wybierz batch ≤ 50 wiadomości `WHERE category IS NULL OR category = 'unclassified'`
- [ ] Wywołaj LLM (Anthropic Claude Haiku — szybki, tani) z promptem:
  ```
  Sklasyfikuj wiadomość Instagram DM otrzymaną przez konto biznesowe (meme account, 500k subów).
  
  Kategorie:
  - business: zapytanie o współpracę, ofertę reklamową, partnership
  - fan_question: pytanie merytoryczne od fana, prośba o radę
  - collab: prośba o repost, wzajemny shout-out, cross-promotion
  - complaint: skarga, krytyka, prośba o usunięcie
  - compliment: pochwała o niskiej wartości akcyjnej
  - spam: scam, phishing, irrelevant promo
  - reaction: tylko reakcja emocjonalna bez treści
  - off_topic: niepasujące do żadnej powyższej
  
  Zwróć JSON: { category, priority (0-5), reasoning (max 100 znaków), suggested_template_id?: uuid }
  
  Wiadomość:
  """
  {message_text}
  """
  
  Sender: @{username}, {follower_count} followers, verified={is_verified}.
  ```
- [ ] Update `instagram_messages` z `classification_method='ai'`, `classification_metadata={model, prompt_version, score, reasoning}`
- [ ] **Rate-limit AI:** max 1000 wiadomości/dzień (kontrola kosztu, ~$3/dzień przy Haiku)
- [ ] Jeśli przekroczono budżet → spadnij na `category='unclassified'` i zaczekaj do następnego dnia

**Compliance — RODO + Meta Platform Terms:**
- [ ] Privacy Policy MUSI deklarować: „Treści DM mogą być przekazywane do third-party AI provider (Anthropic) w celu kategoryzacji"
- [ ] Anthropic API musi mieć włączone ZDR (Zero Data Retention) — przepisać konto na Anthropic Standard Tier z ZDR
- [ ] Endpoint do usuwania danych nadawcy na żądanie (Faza 6)

---

## Faza 5 — UI: filtry i kolejki (~3 dni)

**Plik:** `app/[locale]/admin/dm-inbox/page.tsx` (modyfikacja)

- [ ] Sidebar z zakładkami i licznikami:
  - **Important** (`priority ≥ 4 AND NOT is_archived`) — wyróżnione
  - **Business** (`category IN ('business', 'collab')`)
  - **Fan questions** (`category = 'fan_question'`)
  - **Reactions** (`category IN ('reaction', 'story_reply', 'media_only')`) — collapsed agregat
  - **Spam** (`category = 'spam'`)
  - **All**
  - **Archived**

- [ ] Lista konwersacji w głównym widoku:
  - Sortowanie: `top_priority DESC, last_message_at DESC`
  - Badge na avatarze: kolor wg `top_category`
  - Liczba „❤️ × N reactions" zamiast pojedynczych reakcji
  - Quick actions: Star ⭐ / Archive 🗄️ / Snooze 💤
  - Hover: tooltip z `classification_metadata.reasoning`

- [ ] Bulk actions:
  - „Archive all reactions older than 7 days" (jeden przycisk → przenosi setki wiadomości na raz)
  - „Mark spam → block sender" (UPDATE `instagram_participants` → `sender_score = -1`)

- [ ] User override:
  - Klik kategorii w wiadomości → dropdown „Reklasyfikuj na…"
  - Insert do `message_classification_overrides` (nowa tabela) → feed do retreningu

- [ ] Search: po `participant_username` lub `message_text` (Postgres FTS, polski słownik `polish`)

**Komponenty do dodania:**
- `app/components/inbox/inbox-sidebar.tsx`
- `app/components/inbox/conversation-card.tsx` (rozszerzenie istniejącego)
- `app/components/inbox/category-badge.tsx`
- `app/components/inbox/bulk-actions-bar.tsx`

---

## Faza 6 — Compliance & data lifecycle (~1.5 dnia)

Critical PRZED App Review submission.

- [ ] **Privacy Policy** publiczna pod URL (np. `/privacy`):
  - co zbieramy (treści DM, metadane nadawcy)
  - po co (filtrowanie inbox dla operatora konta)
  - z kim dzielimy (Anthropic AI dla klasyfikacji, Supabase dla storage, Vercel dla hostingu)
  - retencja (90 dni dla treści DM, klasyfikacja persystowana)
  - prawa nadawcy (RODO: dostęp, usunięcie, sprzeciw)
  - kontakt do DPO

- [ ] **Terms of Service** pod URL (`/terms`)

- [ ] **Auto-delete cron** `app/api/cron/cleanup-old-messages/route.ts`:
  - Co noc: DELETE z `instagram_messages` gdzie `created_at < now() - 90 days` AND `is_starred = false`
  - Zachowaj agregaty/klasyfikację (anonymized)

- [ ] **DSR endpoint** `app/api/dsr/delete-participant/route.ts`:
  - POST `{participant_ig_id}` → admin-only → DELETE wszystkich wiadomości od tego nadawcy + jego rekordu z `instagram_participants`
  - Audit log do `admin_audit_log`

- [ ] **Disclosure w UI**:
  - Banner przy pierwszym wejściu w Inbox: „Wiadomości są kategoryzowane automatycznie przez AI. Treść DM może być przesłana do Anthropic API. [Privacy Policy]"

---

## Faza 7 — App Review submission (~1 dzień, po implementacji 1–6)

- [ ] **Usunąć z OAuth scope nieużywane uprawnienia** — `app/api/auth/link-facebook/route.ts:40`:
  - usuń `instagram_manage_comments` (nigdzie nie używane)
  - usuń `instagram_manage_contents` (nigdzie nie używane)
- [ ] **Screencast (po angielsku, 2–3 min)** demonstrujący:
  1. Admin loguje się
  2. Wchodzi w Inbox → widzi 12 nowych konwersacji
  3. Filtr „Important" → wyświetla 2 (collab + fan question)
  4. Pokazuje że reakcje są zwinięte i nie zaśmiecają widoku
  5. Odpowiada na collab w trybie RESPONSE w 24h oknie
  6. **Nigdzie nie wysyła proaktywnej / masowej wiadomości**
- [ ] **Wypełnić App Review per uprawnienie:**
  - `instagram_basic` — uzasadnienie: identyfikacja konta klienta
  - `instagram_content_publish` — uzasadnienie: scheduling stories
  - `instagram_manage_insights` — uzasadnienie: dashboard analityki dla admina
  - `instagram_manage_messages` — uzasadnienie: **inbox triage przy 500k subów** (NIE chatbot, NIE proactive messaging)
- [ ] Privacy Policy URL i ToS URL podać w submission
- [ ] Business Verification dla `instagram_manage_messages` (wymaga dokumentów firmy klienta)

---

## Wydajność przy 500k subów (sanity check)

| Wektor | Szacunek | Wymaganie |
|---|---|---|
| Stories publikowane / dzień | 5–10 | bez problemu |
| DM przychodzące / dzień | 500–50 000 | webhook musi być fast (< 1s) |
| Reactions / dzień | 5 000–500 000 | agregacja, nie 1 row per reakcja w UI |
| AI classification calls / dzień | ≤ 1 000 (po fast-path) | budżet ~$3/dzień Haiku |
| Storage growth | ~50 MB / miesiąc | OK na Supabase Pro |
| Webhook concurrency peak | ~100 req/s | Vercel Functions OK |

---

## Co to znaczy dla maila do Mety / memo dla klienta

Po implementacji powyższego, w App Review submission możemy uczciwie napisać:

> „This application uses `instagram_manage_messages` exclusively for **inbox triage of inbound
> user-initiated conversations**. The account operates at scale (>500k followers) where manual
> triage of incoming DMs is infeasible. Our system classifies messages into categories
> (reactions, business inquiries, fan questions, spam) using rule-based and AI-assisted
> classification, allowing the human operator to focus on high-priority conversations.
> 
> The application **does not**: send proactive messages, perform mass messaging, send
> promotional content, or message users outside the 24-hour user-initiated response window.
> All outgoing messages use `messaging_type: 'RESPONSE'` and require an admin to manually
> compose them in the UI. There is no broadcast endpoint, bulk-send feature, or auto-reply
> mechanism implemented."

To jest treść, która Meta lubi i którą zaaprobuje.

---

## Kolejność implementacji (rekomendacja)

1. **Faza 1** (schema) — fundament, blokuje wszystko inne
2. **Faza 2** (rules) + **Faza 3** (webhook integration) — równolegle, MVP klasyfikacji działa
3. **Faza 5** (UI) — pierwszy widoczny dla klienta efekt
4. **Faza 6** (compliance) — bramka do App Review
5. **Faza 4** (AI) — opcjonalne, można skipnąć dla MVP
6. **Faza 7** (App Review) — dopiero po wszystkich powyżej + 2 tyg testów wewnętrznych

**Estymacja:** 8–10 dni roboczych dla seniora, ~2 tygodnie z testami i iteracjami.

---

## Otwarte pytania (do ustalenia z klientem)

- [ ] Czy klient chce ZDR z Anthropic, czy może akceptować OpenAI? (różnica w cenie, dostępności PL prompt)
- [ ] Jaki jest preferowany język klasyfikacji domyślnie — PL czy EN? (większość keywordów ma się różnić)
- [ ] Kto będzie operatorem inbox? Jeden admin czy zespół? (wpływa na multi-user RLS w Faza 1)
- [ ] Czy template'y z `message_templates.trigger_keywords` mają działać jako **podpowiedzi** (admin klika), czy nigdy auto-reply? (Meta dopuszcza auto-reply w 24h, ale to ryzyko bana jeśli źle)
- [ ] Retencja DM treści — 90 dni jest OK? Klient może chcieć 30 lub 365.
