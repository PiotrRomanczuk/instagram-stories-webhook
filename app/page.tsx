import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getLinkedFacebookAccount } from "@/lib/linked-accounts-db";
import { redirect } from "next/navigation";
import { StatusSection } from "./components/home/status-section";
import { ClientTestForm } from "./components/home/client-form";
import { WebhookSection } from "./components/home/webhook-section";
import HomeHeader from "./components/home/home-header";

export default async function Home() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/auth/signin");
  }

  // Check if Facebook is connected via the database
  const linkedAccount = await getLinkedFacebookAccount(session.user.id);
  const isFacebookConnected = !!linkedAccount && !!linkedAccount.ig_user_id;

  // Since we don't have a database column for webhookUrl yet, we'll construct it from env
  const appUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const webhookUrl = `${appUrl}/api/webhook/story`;

  return (
    <main className="min-h-screen bg-white dark:bg-[#09090b] text-slate-900 dark:text-white selection:bg-indigo-500/30 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-6">
        <HomeHeader />

        <div className="pb-24 -mt-8 relative z-10">
          <div className="space-y-8">
            {/* Connection Status Section */}
            <div className="rounded-[2.5rem] overflow-hidden border border-slate-100 dark:border-white/5 shadow-xl shadow-slate-200/50 dark:shadow-black/50 bg-white dark:bg-[#121214] transition-colors duration-300">
              <StatusSection isConnected={isFacebookConnected} />
            </div>

            {/* Main Dashboard Content */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left Column: Form */}
              <div className={`transition-all duration-500 ${isFacebookConnected ? 'opacity-100 translate-y-0' : 'opacity-40 translate-y-4 pointer-events-none grayscale'}`}>
                <div className="h-full p-8 md:p-10 bg-white dark:bg-[#121214] rounded-[2.5rem] border border-slate-100 dark:border-white/5 shadow-xl shadow-slate-200/50 dark:shadow-black/50 transition-colors duration-300">
                  <h3 className="text-xl font-black mb-8 text-slate-800 dark:text-white flex items-center gap-3">
                    <span className="flex w-8 h-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                      1
                    </span>
                    Test Integration
                  </h3>
                  <ClientTestForm />
                </div>
              </div>

              {/* Right Column: Webhook Info */}
              <div className={`transition-all duration-500 delay-100 ${isFacebookConnected ? 'opacity-100 translate-y-0' : 'opacity-40 translate-y-4 pointer-events-none grayscale'}`}>
                <div className="h-full bg-white dark:bg-[#121214] rounded-[2.5rem] border border-slate-100 dark:border-white/5 shadow-xl shadow-slate-200/50 dark:shadow-black/50 overflow-hidden transition-colors duration-300">
                  <div className="p-8 md:p-10 pb-0">
                    <h3 className="text-xl font-black mb-2 text-slate-800 dark:text-white flex items-center gap-3">
                      <span className="flex w-8 h-8 items-center justify-center rounded-lg bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400">
                        2
                      </span>
                      Developer API
                    </h3>
                  </div>
                  <WebhookSection webhookUrl={webhookUrl} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
