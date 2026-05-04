'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { categoriesByKind } from '@/lib/fixtures/v0';
import { Upload, X } from 'lucide-react';
import { toast } from 'sonner';

export function V0SubmitForm() {
	const [selectedCats, setSelectedCats] = useState<string[]>([]);
	const [keywords, setKeywords] = useState<string[]>([]);
	const [keywordDraft, setKeywordDraft] = useState('');
	const [caption, setCaption] = useState('');

	const toggleCat = (slug: string) =>
		setSelectedCats((s) => (s.includes(slug) ? s.filter((x) => x !== slug) : [...s, slug]));

	const addKeyword = () => {
		const k = keywordDraft.trim().toLowerCase();
		if (!k || keywords.includes(k)) return;
		setKeywords((kw) => [...kw, k]);
		setKeywordDraft('');
	};

	const removeKeyword = (k: string) => setKeywords((kw) => kw.filter((x) => x !== k));

	const onSubmit = () => {
		toast.success('Submission queued', {
			description: `${selectedCats.length} categories · ${keywords.length} keywords. Demo only — wired to backend in v1.`,
		});
		setSelectedCats([]);
		setKeywords([]);
		setCaption('');
	};

	return (
		<div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
			<div className="space-y-6">
				<Card>
					<CardHeader>
						<CardTitle>1. Upload</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="flex flex-col items-center justify-center rounded-md border-2 border-dashed bg-muted/30 p-12 text-center">
							<Upload className="h-8 w-8 text-muted-foreground mb-2" />
							<p className="text-sm font-medium">Drag & drop image or video here</p>
							<p className="text-xs text-muted-foreground mt-1">
								Max 50MB image · 200MB video. Demo only — drop is mocked.
							</p>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>2. Caption (optional)</CardTitle>
					</CardHeader>
					<CardContent>
						<Input
							value={caption}
							onChange={(e) => setCaption(e.target.value)}
							placeholder="Optional context for the curator"
						/>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>3. Categories (locked taxonomy)</CardTitle>
						<p className="text-xs text-muted-foreground pt-1">
							Pick 1-3. AI suggests these in v1; you confirm or correct.
						</p>
					</CardHeader>
					<CardContent className="space-y-4">
						{(['holiday', 'theme', 'event', 'content_type'] as const).map((kind) => (
							<div key={kind}>
								<Label className="text-xs uppercase text-muted-foreground">{kind.replace('_', ' ')}</Label>
								<div className="flex flex-wrap gap-1.5 mt-2">
									{categoriesByKind(kind).map((c) => (
										<button
											key={c.slug}
											onClick={() => toggleCat(c.slug)}
											className={`rounded-full border px-3 py-1 text-xs transition-colors ${
												selectedCats.includes(c.slug)
													? 'bg-foreground text-background border-foreground'
													: 'bg-background hover:bg-muted'
											}`}
										>
											{c.label}
										</button>
									))}
								</div>
							</div>
						))}
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>4. Keywords (free-form)</CardTitle>
					</CardHeader>
					<CardContent className="space-y-3">
						<div className="flex gap-2">
							<Input
								value={keywordDraft}
								onChange={(e) => setKeywordDraft(e.target.value)}
								onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
								placeholder="e.g. sunset, neon, retro — Enter to add"
							/>
							<Button variant="outline" onClick={addKeyword}>
								Add
							</Button>
						</div>
						<div className="flex flex-wrap gap-1.5">
							{keywords.map((k) => (
								<Badge key={k} variant="secondary" className="gap-1">
									{k}
									<button onClick={() => removeKeyword(k)} aria-label={`Remove ${k}`}>
										<X className="h-3 w-3" />
									</button>
								</Badge>
							))}
						</div>
					</CardContent>
				</Card>
			</div>

			<div className="lg:sticky lg:top-4 self-start">
				<Card>
					<CardHeader>
						<CardTitle>Summary</CardTitle>
					</CardHeader>
					<CardContent className="space-y-3 text-sm">
						<Row label="Categories" value={`${selectedCats.length}`} />
						<Row label="Keywords" value={`${keywords.length}`} />
						<Row label="Caption" value={caption ? 'Yes' : 'No'} />
						<Button className="w-full mt-2" onClick={onSubmit} disabled={selectedCats.length === 0}>
							Submit for review
						</Button>
						<p className="text-xs text-muted-foreground">
							Once submitted, the curator reviews on /review. You&apos;ll see status updates on /submissions/v0.
						</p>
					</CardContent>
				</Card>
			</div>
		</div>
	);

	function Row({ label, value }: { label: string; value: string }) {
		return (
			<div className="flex justify-between border-b pb-2">
				<span className="text-muted-foreground">{label}</span>
				<span className="font-medium">{value}</span>
			</div>
		);
	}
}
