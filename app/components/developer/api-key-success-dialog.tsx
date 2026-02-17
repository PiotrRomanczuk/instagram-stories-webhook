'use client';
import { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/app/components/ui/dialog';
import { Alert, AlertDescription } from '@/app/components/ui/alert';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Copy, Check, AlertTriangle, ExternalLink, Calendar, Shield } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Link } from '@/i18n/routing';
import type { GeneratedApiKey } from './api-keys-manager';

interface ApiKeySuccessDialogProps {
  generatedKey: GeneratedApiKey;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ApiKeySuccessDialog({ generatedKey, open, onOpenChange }: ApiKeySuccessDialogProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(generatedKey.key);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, [generatedKey.key]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>API Key Generated Successfully</DialogTitle>
          <DialogDescription>
            Copy your API key now. You won&apos;t be able to see it again.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="font-medium">
              Copy this key now! It won&apos;t be shown again for security reasons.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Your API Key</span>
              <Button size="sm" variant="outline" onClick={handleCopy} className="gap-2">
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-green-600" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    Copy
                  </>
                )}
              </Button>
            </div>
            <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-sm break-all">
              {generatedKey.key}
            </div>
          </div>

          <div className="space-y-2 p-4 bg-muted rounded-lg">
            <h4 className="font-semibold text-sm flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Key Details
            </h4>
            <div className="space-y-1.5 text-sm">
              {generatedKey.apiKey.name && (
                <div className="flex items-start gap-2">
                  <span className="text-muted-foreground min-w-[80px]">Name:</span>
                  <span className="font-medium">{generatedKey.apiKey.name}</span>
                </div>
              )}
              <div className="flex items-start gap-2">
                <span className="text-muted-foreground min-w-[80px]">Scopes:</span>
                <div className="flex flex-wrap gap-1">
                  {generatedKey.apiKey.scopes.map((scope) => (
                    <Badge key={scope} variant="secondary" className="text-xs">
                      {scope}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-muted-foreground min-w-[80px]">Created:</span>
                <span>{formatDistanceToNow(new Date(generatedKey.apiKey.createdAt), { addSuffix: true })}</span>
              </div>
              {generatedKey.apiKey.expiresAt && (
                <div className="flex items-start gap-2">
                  <span className="text-muted-foreground min-w-[80px]">Expires:</span>
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    {formatDistanceToNow(new Date(generatedKey.apiKey.expiresAt), { addSuffix: true })}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2 p-4 border rounded-lg">
            <h4 className="font-semibold text-sm">Quick Start</h4>
            <ol className="text-sm space-y-2 list-decimal list-inside marker:font-semibold">
              <li>Copy the API key above and store it securely</li>
              <li>Add it to your application&apos;s environment variables</li>
              <li>
                Include it in requests using the{' '}
                <code className="bg-muted px-1.5 py-0.5 rounded text-xs">
                  Authorization: Bearer YOUR_KEY
                </code>{' '}
                header
              </li>
              <li>Test your integration to ensure it works</li>
            </ol>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" className="gap-2 flex-1" asChild>
              <Link href="/test-api-key">
                Test API Key
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            </Button>
            <Button variant="outline" className="gap-2 flex-1" asChild>
              <a href="https://github.com/PiotrRomanczuk/instagram-stories-webhook/blob/master/docs/IPHONE_WIDGET.md" target="_blank" rel="noopener noreferrer">
                View Docs
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </Button>
          </div>

          <div className="border-t pt-4 mt-4">
            <h4 className="font-semibold text-sm mb-2">Security Notes</h4>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• Never share your API key publicly or commit it to version control</li>
              <li>• Use environment variables to store keys securely</li>
              <li>• Rotate keys regularly and revoke unused keys</li>
              <li>• Monitor key usage in the dashboard for suspicious activity</li>
            </ul>
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
