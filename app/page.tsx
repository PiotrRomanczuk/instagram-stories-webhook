import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getLinkedFacebookAccount } from "@/lib/linked-accounts-db";
import { redirect } from "next/navigation";
import { StatusSection } from "./components/home/status-section";
import HomeHeader from "./components/home/home-header";
import { ScheduleManager } from "./components/schedule/schedule-manager";
import Link from "next/link";
import { ArrowRight, Terminal } from "lucide-react";

export default async function Home() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/auth/signin");
  }

  // Check if Facebook is connected via the database
  const linkedAccount = await getLinkedFacebookAccount(session.user.id);
  const isFacebookConnected = !!linkedAccount && !!linkedAccount.ig_user_id;

  // Since we don't have a database column for webhookUrl yet, we'll construct it from env
  // const appUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

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

            {/* Main Scheduler Content */}
            <div className={`transition-all duration-500 ${isFacebookConnected ? 'opacity-100 translate-y-0' : 'opacity-40 translate-y-4 pointer-events-none grayscale'}`}>
              <ScheduleManager />
            </div>

            {/* Developer Tools Link */}
            <div className="flex justify-center pt-8 pb-12">
              <Link href="/developer" className="group flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-indigo-500 transition-colors uppercase tracking-widest bg-slate-50 dark:bg-white/5 px-6 py-3 rounded-full border border-slate-100 dark:border-white/5">
                <Terminal className="w-4 h-4" />
                Open Developer Tools
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
