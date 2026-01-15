import { getTokens } from '@/lib/db';
import { HomeHeader } from './components/home/home-header';
import { StatusSection } from './components/home/status-section';
import { WebhookSection } from './components/home/webhook-section';
import { HomeFooter } from './components/home/home-footer';

export default async function Home() {
  const tokens = await getTokens();
  const isConnected = !!tokens?.access_token;
  const webhookUrl = process.env.NEXT_PUBLIC_APP_URL
    ? `${process.env.NEXT_PUBLIC_APP_URL}/api/webhook/story`
    : 'http://localhost:3000/api/webhook/story';

  return (
    <main className="min-h-screen bg-[#FDFDFF] flex flex-col items-center justify-center p-6 md:p-12">
      <div className="max-w-2xl w-full">
        <HomeHeader />

        <div className="bg-white rounded-[32px] shadow-2xl shadow-indigo-100/40 border border-slate-100 overflow-hidden">
          <StatusSection isConnected={isConnected} />

          {isConnected && (
            <WebhookSection webhookUrl={webhookUrl} />
          )}
        </div>

        <HomeFooter />
      </div>
    </main>
  );
}
