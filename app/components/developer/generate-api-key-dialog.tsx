'use client';
import { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Button } from '@/app/components/ui/button';
import { Checkbox } from '@/app/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/app/components/ui/radio-group';
import { Alert, AlertDescription } from '@/app/components/ui/alert';
import { Loader2, AlertCircle } from 'lucide-react';

interface GenerateApiKeyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGenerate: (data: { name?: string; scopes?: string[]; expiresAt?: string }) => Promise<void>;
}

const AVAILABLE_SCOPES = [
  { id: 'cron:read', label: 'Cron: Read', description: 'View cron job status and history' },
  { id: 'logs:read', label: 'Logs: Read', description: 'Access application logs' },
];

type ExpirationOption = 'never' | '3months' | '6months' | 'custom';

export function GenerateApiKeyDialog({ open, onOpenChange, onGenerate }: GenerateApiKeyDialogProps) {
  const [name, setName] = useState('');
  const [scopes, setScopes] = useState<string[]>([]);
  const [expiration, setExpiration] = useState<ExpirationOption>('never');
  const [customDate, setCustomDate] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleScopeToggle = useCallback((scopeId: string) => {
    setScopes((prev) =>
      prev.includes(scopeId) ? prev.filter((s) => s !== scopeId) : [...prev, scopeId]
    );
  }, []);

  const handleGenerate = useCallback(async () => {
    setError(null);
    if (scopes.length === 0) {
      setError('Please select at least one scope');
      return;
    }

    if (expiration === 'custom' && !customDate) {
      setError('Please select a custom expiration date');
      return;
    }

    setIsGenerating(true);
    try {
      let expiresAt: string | undefined;
      if (expiration === '3months') {
        const date = new Date();
        date.setMonth(date.getMonth() + 3);
        expiresAt = date.toISOString();
      } else if (expiration === '6months') {
        const date = new Date();
        date.setMonth(date.getMonth() + 6);
        expiresAt = date.toISOString();
      } else if (expiration === 'custom' && customDate) {
        expiresAt = new Date(customDate).toISOString();
      }

      await onGenerate({ name: name.trim() || undefined, scopes, expiresAt });
      setName('');
      setScopes([]);
      setExpiration('never');
      setCustomDate('');
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate API key');
    } finally {
      setIsGenerating(false);
    }
  }, [name, scopes, expiration, customDate, onGenerate]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Generate New API Key</DialogTitle>
          <DialogDescription>
            Create a new API key for external integrations. Keys are only shown once.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="key-name">Name (optional)</Label>
            <Input id="key-name" placeholder="e.g., Mobile Widget, Production Server" value={name} onChange={(e) => setName(e.target.value)} disabled={isGenerating} />
            <p className="text-xs text-muted-foreground">Help identify where this key is used</p>
          </div>

          <div className="space-y-3">
            <Label>Scopes (select at least one)</Label>
            {AVAILABLE_SCOPES.map((scope) => (
              <div key={scope.id} className="flex items-start gap-3">
                <Checkbox id={scope.id} checked={scopes.includes(scope.id)} onCheckedChange={() => handleScopeToggle(scope.id)} disabled={isGenerating} className="mt-0.5" />
                <div className="flex-1">
                  <Label htmlFor={scope.id} className="text-sm font-medium cursor-pointer">{scope.label}</Label>
                  <p className="text-xs text-muted-foreground">{scope.description}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-3">
            <Label>Expiration</Label>
            <RadioGroup value={expiration} onValueChange={(value) => setExpiration(value as ExpirationOption)} disabled={isGenerating}>
              <div className="flex items-center gap-2"><RadioGroupItem value="never" id="never" /><Label htmlFor="never" className="cursor-pointer font-normal">Never</Label></div>
              <div className="flex items-center gap-2"><RadioGroupItem value="3months" id="3months" /><Label htmlFor="3months" className="cursor-pointer font-normal">3 months</Label></div>
              <div className="flex items-center gap-2"><RadioGroupItem value="6months" id="6months" /><Label htmlFor="6months" className="cursor-pointer font-normal">6 months</Label></div>
              <div className="flex items-center gap-2"><RadioGroupItem value="custom" id="custom" /><Label htmlFor="custom" className="cursor-pointer font-normal">Custom date</Label></div>
            </RadioGroup>
            {expiration === 'custom' && (
              <Input type="date" value={customDate} onChange={(e) => setCustomDate(e.target.value)} disabled={isGenerating} min={new Date().toISOString().split('T')[0]} className="mt-2" />
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isGenerating}>Cancel</Button>
          <Button onClick={handleGenerate} disabled={isGenerating || scopes.length === 0} className="gap-2">
            {isGenerating && <Loader2 className="h-4 w-4 animate-spin" />}
            Generate Key
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
