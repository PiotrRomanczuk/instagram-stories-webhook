# i18n Manager

Manages internationalization workflows for the `next-intl` setup with `en.json` and `pl.json` message files.

## Usage

Invoke when adding new UI text, checking translation completeness, or adding a new locale.

## Architecture

| File | Purpose |
|------|---------|
| `messages/en.json` | English translations (primary) |
| `messages/pl.json` | Polish translations |
| `i18n/request.ts` | next-intl request configuration |
| `i18n/routing.ts` | Locale routing configuration |
| `app/[locale]/layout.tsx` | Locale-aware layout |
| `middleware.ts` | Locale detection middleware |

## Workflows

### 1. Check Translation Completeness

Compare keys between `en.json` and `pl.json` to find missing translations:

```bash
# Extract all keys from both files and diff
node -e "
const en = require('./messages/en.json');
const pl = require('./messages/pl.json');

function flatKeys(obj, prefix = '') {
  return Object.entries(obj).flatMap(([k, v]) =>
    typeof v === 'object' && v !== null
      ? flatKeys(v, prefix + k + '.')
      : [prefix + k]
  );
}

const enKeys = new Set(flatKeys(en));
const plKeys = new Set(flatKeys(pl));

const missingInPl = [...enKeys].filter(k => !plKeys.has(k));
const missingInEn = [...plKeys].filter(k => !enKeys.has(k));

if (missingInPl.length) console.log('Missing in pl.json:', missingInPl);
if (missingInEn.length) console.log('Missing in en.json:', missingInEn);
if (!missingInPl.length && !missingInEn.length) console.log('All translations complete!');
"
```

### 2. Find Hardcoded Strings in Components

Search for strings that should use translations:

```bash
# Find potential hardcoded UI text in components
grep -rn ">[A-Z][a-z].*</" app/components/ --include='*.tsx' | grep -v 'className' | grep -v '{t('
```

### 3. Extract Translation Keys from Components

Find all `useTranslations` and `t()` calls to verify they have matching keys:

```bash
# Find all translation key usage
grep -rn "t('" app/ --include='*.tsx' --include='*.ts' | grep -oP "t\('([^']+)'\)" | sort -u
```

### 4. Add a New Locale

1. Create `messages/<locale>.json` (copy from `en.json`)
2. Update `i18n/routing.ts` to add the locale to the list
3. Update `middleware.ts` if locale detection logic needs changes
4. Translate all keys in the new file

## Conventions

- **Key structure**: Nested by page/component (`"Navbar.dashboard"`, `"Home.title"`)
- **Primary locale**: English (`en.json`) is the source of truth
- **Interpolation**: Use `{variable}` syntax for dynamic values
- **Pluralization**: Use ICU message format when needed

## Adding New Text

1. Add key to `messages/en.json` under the appropriate section
2. Add the same key to `messages/pl.json` with Polish translation
3. Use `useTranslations('SectionName')` in the component
4. Reference with `t('keyName')` or `t('nested.keyName')`

```typescript
// Component usage
import { useTranslations } from 'next-intl';

export function MyComponent() {
  const t = useTranslations('MySection');
  return <h1>{t('title')}</h1>;
}
```
