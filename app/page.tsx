import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getLinkedFacebookAccount } from "@/lib/database/linked-accounts";
import { redirect } from "next/navigation";
import { StatusSection } from "./components/home/status-section";
import HomeHeader from "./components/home/home-header";
import Link from "next/link";
import { ArrowRight, Terminal, Shield, Sparkles } from "lucide-react";
import { UserRole } from "@/lib/types";

export default async function Home() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/auth/signin");
  }

  // Check if Facebook is connected via the database
  const linkedAccount = await getLinkedFacebookAccount(session.user.id);
  const isFacebookConnected = !!linkedAccount && !!linkedAccount.ig_user_id;

  return (
    <main className="min-h-screen bg-[#F8FAFC] text-slate-900 selection:bg-indigo-500/30">
      <div className="max-w-7xl mx-auto px-6">
        <HomeHeader />

        <div className="pb-24 -mt-8 relative z-10">
          <div className="space-y-8">
            {/* Connection Status Section */}
            <div className="rounded-[2.5rem] overflow-hidden border border-slate-100 shadow-xl shadow-slate-200/50 bg-white">
              <StatusSection isConnected={isFacebookConnected} />
            </div>

            {/* Feature Navigation */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Link
                href="/memes"
                className="group relative overflow-hidden p-6 rounded-3xl bg-white border border-slate-100 shadow-lg shadow-indigo-500/5 hover:shadow-indigo-500/10 transition-all duration-300"
              >
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Sparkles className="w-24 h-24 text-indigo-500 transform rotate-12 translate-x-4 -translate-y-4" />
                </div>
                <div className="relative z-10">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                    <Sparkles className="w-6 h-6 text-indigo-600" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-1">Meme Submissions</h3>
                  <p className="text-sm text-slate-500">Submit and manage your memes</p>
                </div>
              </Link>

              {['admin', 'developer'].includes((session.user as { role?: UserRole }).role || '') && (
                <Link
                  href="/admin/memes"
                  className="group relative overflow-hidden p-6 rounded-3xl bg-white border border-slate-100 shadow-lg shadow-purple-500/5 hover:shadow-purple-500/10 transition-all duration-300"
                >
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Shield className="w-24 h-24 text-purple-500 transform rotate-12 translate-x-4 -translate-y-4" />
                  </div>
                  <div className="relative z-10">
                    <div className="w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                      <Shield className="w-6 h-6 text-purple-600" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mb-1">Admin Dashboard</h3>
                    <p className="text-sm text-slate-500">Review submissions & users</p>
                  </div>
                </Link>
              )}
            </div>

            {/* Dashboard Navigation Cards Only */}

            {/* Developer Tools Link */}
            <div className="flex justify-center pt-8 pb-12">
              <Link href="/developer" className="group flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-indigo-500 transition-colors uppercase tracking-widest bg-white px-6 py-3 rounded-full border border-slate-100">
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
