import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ChevronRight,
  FileText,
  HelpCircle,
  Info,
  LogOut,
  ShieldCheck,
  ShieldHalf,
  Trash2,
  UserX,
  type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';

import { SiteLayout, GlassCard } from '@/components/SiteLayout';
import { SignInPanel } from '@/components/SignInPanel';
import { useAuth } from '@/lib/auth';
import { history } from '@/lib/history';
import { deleteAccount, fetchPortalProfile } from '@/lib/portalApi';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

function Row({ to, icon: Icon, label, tint }: { to: string; icon: LucideIcon; label: string; tint: string }) {
  return (
    <Link to={to} className="flex min-h-14 items-center gap-3.5 rounded-xl px-3 transition-colors hover:bg-white/5">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10" style={{ color: tint }}>
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <span className="flex-1 text-[15px] font-medium">{label}</span>
      <ChevronRight className="h-4 w-4 text-white/50" aria-hidden="true" />
    </Link>
  );
}

const Settings = () => {
  const { user, getAccessToken, signOut } = useAuth();
  const [confirmDelete, setConfirmDelete] = useState<boolean>(false);
  const [confirmClear, setConfirmClear] = useState<boolean>(false);

  const profileQuery = useQuery({
    queryKey: ['portal-profile', user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const token = await getAccessToken();
      if (!token) throw new Error('Your session expired. Please sign in again.');
      return fetchPortalProfile(token);
    },
  });

  const onDelete = async (): Promise<void> => {
    try {
      const token = await getAccessToken();
      if (!token) throw new Error('Your session expired.');
      await deleteAccount(token);
      signOut();
      toast.success('Your account has been deleted.');
    } catch {
      toast.error("Couldn't delete your account right now. Please try again, or email support@zomitranslator.com.");
    }
  };

  return (
    <SiteLayout>
      <div className="mx-auto w-full max-w-2xl space-y-6 px-4 pt-5 sm:px-6 md:pt-10">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight sm:text-3xl">Settings</h1>
          <p className="mt-1 text-white/75">Account, help, and privacy</p>
        </div>

        <section aria-labelledby="account-heading" className="space-y-3">
          <h2 id="account-heading" className="text-lg font-bold">Account</h2>
          {user ? (
            <GlassCard>
              <p className="text-lg font-bold">{user.name ?? 'Signed in'}</p>
              <p className="text-sm text-white/70">{user.email}</p>
              <p className="mt-2 text-sm text-white/80">Unlimited translation and synced history are on.</p>
              <div className="mt-4 space-y-1">
                {profileQuery.data?.role === 'admin' && <Row to="/admin" icon={ShieldHalf} label="Admin dashboard" tint="#ff4d9e" />}
                <button type="button" onClick={signOut} className="flex min-h-14 w-full items-center gap-3.5 rounded-xl px-3 text-left hover:bg-white/5">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10"><LogOut className="h-5 w-5" aria-hidden="true" /></span>
                  <span className="flex-1 text-[15px] font-medium">Sign out</span>
                </button>
                <button type="button" onClick={() => setConfirmDelete(true)} className="flex min-h-14 w-full items-center gap-3.5 rounded-xl px-3 text-left text-[#ff8a8a] hover:bg-white/5">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#ff5e5e]/15"><UserX className="h-5 w-5" aria-hidden="true" /></span>
                  <span className="flex-1 text-[15px] font-medium">Delete account</span>
                </button>
              </div>
            </GlassCard>
          ) : (
            <SignInPanel
              title="Sign in (optional)"
              message="Translation is free without an account. Sign in with Google or Apple for unlimited translation and history that syncs between your devices."
            />
          )}
        </section>

        <section aria-labelledby="help-heading" className="space-y-3">
          <h2 id="help-heading" className="text-lg font-bold">Help &amp; About</h2>
          <GlassCard className="p-2">
            <Row to="/support" icon={HelpCircle} label="Help & Support" tint="#00ff88" />
            <Row to="/about" icon={Info} label="About Zomi Translator" tint="#00f0ff" />
            <Row to="/privacy" icon={ShieldCheck} label="Privacy Policy" tint="#8c5cff" />
            <Row to="/terms" icon={FileText} label="Terms of Service" tint="#fff200" />
          </GlassCard>
        </section>

        <section aria-labelledby="data-heading" className="space-y-3">
          <h2 id="data-heading" className="text-lg font-bold">Data</h2>
          <GlassCard className="p-2">
            <button type="button" onClick={() => setConfirmClear(true)} className="flex min-h-14 w-full items-center gap-3.5 rounded-xl px-3 text-left text-[#ff8a8a] hover:bg-white/5">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#ff5e5e]/15"><Trash2 className="h-5 w-5" aria-hidden="true" /></span>
              <span className="flex-1 text-[15px] font-medium">Clear history in this browser</span>
            </button>
          </GlassCard>
          <p className="px-1 text-sm text-white/65">Your history is saved in this browser. When you're signed in, it also syncs with your account.</p>
        </section>

        <p className="pb-4 text-center text-xs text-white/55">Zomi Translator · © {new Date().getFullYear()} Zomi Language &amp; Literature Resource Center</p>
      </div>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent className="border-white/15 bg-[#252a41] text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete your account?</AlertDialogTitle>
            <AlertDialogDescription className="text-white/75">
              This permanently deletes your account and the history saved with it. This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/20 bg-transparent text-white hover:bg-white/10">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void onDelete()} className="bg-[#ff5e5e] text-white hover:bg-[#ff5e5e]/90">Delete account</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmClear} onOpenChange={setConfirmClear}>
        <AlertDialogContent className="border-white/15 bg-[#252a41] text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Clear history?</AlertDialogTitle>
            <AlertDialogDescription className="text-white/75">This removes every saved translation in this browser.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/20 bg-transparent text-white hover:bg-white/10">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => history.clear()} className="bg-[#ff5e5e] text-white hover:bg-[#ff5e5e]/90">Clear history</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SiteLayout>
  );
};

export default Settings;
