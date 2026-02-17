'use client';

/**
 * API Key Test Page
 *
 * Public page for testing API key authentication.
 * This page is NOT protected by NextAuth - anyone can access it.
 * Used to verify that API key authentication works independently of session cookies.
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Alert, AlertDescription } from '@/app/components/ui/alert';
import { Badge } from '@/app/components/ui/badge';
import { Loader2, Key, CheckCircle2, XCircle, Clock, Activity } from 'lucide-react';

interface CronStatus {
  status: {
    jobs: Array<{
      name: string;
      schedule: string;
      lastRun: string | null;
      lastRunRelative: string;
      lastStatus: string;
      lastMessage: string;
      nextExpectedRun: string;
      nextRunCountdown: string;
    }>;
    timestamp: string;
  };
  metrics: {
    postsInQueue: number;
    postsProcessing: number;
    postsStuck: number;
    failedLast24h: number;
    publishedLast24h: number;
    errorRate: number;
  };
  recentLogs: Array<{
    id: string;
    level: string;
    module: string;
    message: string;
    created_at: string;
  }>;
  timestamp: string;
}

export default function TestApiKeyPage() {
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<CronStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleTest = async () => {
    if (!apiKey.trim()) {
      setError('Please enter an API key');
      return;
    }

    setLoading(true);
    setError(null);
    setData(null);

    try {
      const baseUrl = window.location.origin;
      const response = await fetch(`${baseUrl}/api/mobile/cron-status`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey.trim()}`,
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      setData(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setApiKey('');
    setData(null);
    setError(null);
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Key className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">API Key Test</h1>
          </div>
          <p className="text-gray-600">
            Test your API key authentication by fetching cron status data.
            This page uses <strong>API key authentication</strong> instead of session cookies.
          </p>
        </div>

        {/* API Key Input */}
        <Card>
          <CardHeader>
            <CardTitle>Enter API Key</CardTitle>
            <CardDescription>
              Get your API key from the developer dashboard at <code>/developer</code>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="apiKey">API Key</Label>
              <Input
                id="apiKey"
                type="text"
                placeholder="sk_live_..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="font-mono"
                disabled={loading}
              />
              <p className="text-xs text-gray-500">
                Format: <code>sk_live_...</code> (starts with <code>sk_live_</code>)
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleTest}
                disabled={loading || !apiKey.trim()}
                className="gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Testing...
                  </>
                ) : (
                  <>
                    <Activity className="h-4 w-4" />
                    Test API Key
                  </>
                )}
              </Button>
              <Button
                onClick={handleClear}
                variant="outline"
                disabled={loading}
              >
                Clear
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Error:</strong> {error}
            </AlertDescription>
          </Alert>
        )}

        {/* Success + Data Display */}
        {data && (
          <div className="space-y-4">
            {/* Success Message */}
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                <strong>Success!</strong> API key authentication working correctly.
                Data fetched at {new Date(data.timestamp).toLocaleString()}
              </AlertDescription>
            </Alert>

            {/* Cron Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Cron Job Status
                </CardTitle>
                <CardDescription>
                  Last execution status and next scheduled run
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {data.status.jobs.map((job) => (
                  <div
                    key={job.name}
                    className="rounded-lg border p-4 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold capitalize">{job.name}</h3>
                      <Badge
                        variant={job.lastStatus === 'success' ? 'default' : 'destructive'}
                      >
                        {job.lastStatus}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600">{job.lastMessage}</p>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Last Run:</span>{' '}
                        <span className="font-medium">{job.lastRunRelative}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Next Run:</span>{' '}
                        <span className="font-medium">{job.nextRunCountdown}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Metrics */}
            <Card>
              <CardHeader>
                <CardTitle>Queue Metrics</CardTitle>
                <CardDescription>
                  Current queue health and 24-hour statistics
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <MetricCard
                    label="In Queue"
                    value={data.metrics.postsInQueue}
                    color="blue"
                  />
                  <MetricCard
                    label="Processing"
                    value={data.metrics.postsProcessing}
                    color="yellow"
                  />
                  <MetricCard
                    label="Stuck"
                    value={data.metrics.postsStuck}
                    color={data.metrics.postsStuck > 0 ? 'red' : 'gray'}
                  />
                  <MetricCard
                    label="Published (24h)"
                    value={data.metrics.publishedLast24h}
                    color="green"
                  />
                  <MetricCard
                    label="Failed (24h)"
                    value={data.metrics.failedLast24h}
                    color={data.metrics.failedLast24h > 0 ? 'red' : 'gray'}
                  />
                  <MetricCard
                    label="Error Rate"
                    value={`${data.metrics.errorRate}%`}
                    color={data.metrics.errorRate > 10 ? 'red' : 'gray'}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Recent Logs */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Logs</CardTitle>
                <CardDescription>
                  Last {data.recentLogs.length} system log entries
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {data.recentLogs.map((log) => (
                    <div
                      key={log.id}
                      className="flex items-start gap-3 rounded-lg border p-3 text-sm"
                    >
                      <Badge
                        variant={
                          log.level === 'error'
                            ? 'destructive'
                            : log.level === 'warn'
                            ? 'secondary'
                            : 'outline'
                        }
                        className="mt-0.5"
                      >
                        {log.level}
                      </Badge>
                      <div className="flex-1 space-y-1">
                        <p className="font-medium">{log.message}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(log.created_at).toLocaleString()} •{' '}
                          <code>{log.module}</code>
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Raw JSON */}
            <Card>
              <CardHeader>
                <CardTitle>Raw Response</CardTitle>
                <CardDescription>
                  Complete API response in JSON format
                </CardDescription>
              </CardHeader>
              <CardContent>
                <pre className="overflow-x-auto rounded-lg bg-gray-900 p-4 text-xs text-gray-100">
                  {JSON.stringify(data, null, 2)}
                </pre>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Help Text */}
        {!data && !error && !loading && (
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-6">
              <h3 className="font-semibold text-blue-900 mb-2">How to test:</h3>
              <ol className="space-y-2 text-sm text-blue-800">
                <li>1. Generate an API key at <code>/developer</code> (API Keys tab)</li>
                <li>2. Copy the full API key (starts with <code>sk_live_</code>)</li>
                <li>3. Paste it in the input field above</li>
                <li>4. Click &quot;Test API Key&quot;</li>
                <li>5. If successful, you'll see cron status, metrics, and logs</li>
              </ol>
              <p className="text-xs text-blue-700 mt-4">
                <strong>Note:</strong> This page does NOT use session cookies or NextAuth.
                It authenticates using only the API key via Bearer token.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}

/**
 * Metric display card component
 */
function MetricCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string | number;
  color: 'blue' | 'green' | 'red' | 'yellow' | 'gray';
}) {
  const colors = {
    blue: 'bg-blue-50 border-blue-200 text-blue-900',
    green: 'bg-green-50 border-green-200 text-green-900',
    red: 'bg-red-50 border-red-200 text-red-900',
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-900',
    gray: 'bg-gray-50 border-gray-200 text-gray-900',
  };

  return (
    <div className={`rounded-lg border p-4 ${colors[color]}`}>
      <p className="text-sm font-medium opacity-75">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
  );
}
