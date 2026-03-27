
import { useState, useEffect } from "react";
import { useNavigate, useLoaderData } from "react-router";
import type { SettingsLoaderData } from "~/lib/types/routes";
import { db } from "~/lib/db.server";
import { auth } from "~/lib/auth.server";
import { signOut } from "~/lib/auth-client";
import type { LoaderFunctionArgs } from "react-router";
import { SettingsItem } from "~/components/settings/SettingsItem";
import { SettingsToggle } from "~/components/settings/SettingsToggle";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { toast } from "sonner";
import { BottomNavigation } from "~/components/layout/BottomNavigation";
import * as schema from "~/db/schema";
import { eq, desc } from "drizzle-orm";
import { Input } from "~/components/ui/input";
import { Copy, AlertTriangle, Wallet } from "lucide-react";

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    throw new Response(null, { status: 302, headers: { Location: "/login" } });
  }

  // 1. DB User Info
  const user = await db.query.user.findFirst({
    where: eq(schema.user.id, session.user.id),
    columns: {
      id: true,
      name: true,
      email: true,
      image: true,
      chocoBalance: true,
    },
  });

  return Response.json({ user });
}

export default function SettingsScreen() {
  const { user } = useLoaderData<typeof loader>() as SettingsLoaderData;
  const navigate = useNavigate();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkModeEnabled, setDarkModeEnabled] = useState(true);

  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const [deleteAccountDialogOpen, setDeleteAccountDialogOpen] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [exportWalletDialogOpen, setExportWalletDialogOpen] = useState(false);

  const [privateKey, setPrivateKey] = useState<string | null>(null);
  const [isLoadingPrivateKey, setIsLoadingPrivateKey] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const handleLogout = async () => {
    try {
      await signOut({
        fetchOptions: {
          onSuccess: () => {
            toast.success("Logged out");
            navigate("/home");
          },
        },
      });
    } catch (err) {
      toast.error("An error occurred while logging out");
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeletingAccount(true);
    try {
      const res = await fetch("/api/account/delete", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to delete account.");
        return;
      }
      setDeleteAccountDialogOpen(false);
      await signOut({
        fetchOptions: {
          onSuccess: () => {
            toast.success("Account deleted");
            navigate("/login");
          },
        },
      });
    } catch (err) {
      toast.error("An error occurred while deleting the account.");
    } finally {
      setIsDeletingAccount(false);
    }
  };

  const handleExportWallet = async () => {
    setIsLoadingPrivateKey(true);
    setExportError(null);
    setPrivateKey(null);

    try {
      const response = await fetch("/api/wallet/export-private-key");
      const data = await response.json();

      if (!response.ok) {
        setExportError(data.message || data.error || "Failed to retrieve the private key.");
        return;
      }

      setPrivateKey(data.privateKey);
      toast.success("Private key loaded. Keep it in a safe place.");
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      setExportError(errorMessage || "Failed to retrieve the private key.");
    } finally {
      setIsLoadingPrivateKey(false);
    }
  };

  const handleCopyPrivateKey = async () => {
    if (!privateKey) return;
    try {
      await navigator.clipboard.writeText(privateKey);
      toast.success("Private key copied to clipboard.");
    } catch (error) {
      toast.error("Copy failed.");
    }
  };

  return (
    <div className="bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-white min-h-screen selection:bg-primary selection:text-white">
      <div className="relative flex h-full w-full flex-col max-w-md mx-auto overflow-x-hidden min-h-screen pb-20 md:max-w-lg lg:max-w-xl">
        <header className="sticky top-0 z-50 flex items-center bg-background-light/90 dark:bg-background-dark/90 backdrop-blur-md p-4 justify-between border-b border-black/5 dark:border-white/5 transition-colors duration-300">
          <button
            onClick={() => navigate(-1)}
            className="text-slate-900 dark:text-white flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          >
            <span className="material-symbols-outlined text-[24px]">
              arrow_back_ios_new
            </span>
          </button>
          <h2 className="text-slate-900 dark:text-white text-lg font-bold leading-tight tracking-[-0.015em] flex-1 text-center pr-10">
            Settings
          </h2>
        </header>

        {/* --- Profile Section --- */}
        <div className="p-4 mt-2">
          <div className="flex items-center gap-4 bg-surface-light dark:bg-surface-dark p-4 rounded-2xl shadow-sm dark:shadow-none border border-black/5 dark:border-white/5">
            <div className="relative shrink-0">
              <div
                className="bg-center bg-no-repeat bg-cover rounded-full h-16 w-16 ring-2 ring-primary ring-offset-2 ring-offset-background-light dark:ring-offset-background-dark"
                style={{
                  backgroundImage: `url(${user?.image || 'https://lh3.googleusercontent.com/aida-public/AB6AXuCOz-ycctcRpqXk1y01dxqgp0snDjlfF-joCqG0CVQPw5ohSzu3AvTGunT5CJLn6jmmUrArbyvkZSfww_OY_DP6G1W69xzLPTJTsc3r4Cmmd_Y5upAGheZxCFXb-xlEiEMfR-C-lpw_3w8__RfjC2KevhMzQ8yYvdGnQgQpeQO8AoXgoQbbTmgFbxUFXr44lp-xfW1fL6RQTF-TkByk5PyDtvGVJ8H67dkeCltLiiTpvG9jjjrCReyH8mEAkCAm8q3TqLOz2S-vAWk'})`,
                }}
              />
              <div className="absolute bottom-0 right-0 bg-primary rounded-full p-1 border border-white dark:border-background-dark flex items-center justify-center">
                <span className="material-symbols-outlined text-white text-[12px]">
                  edit
                </span>
              </div>
            </div>
            <div className="flex flex-col justify-center flex-1 min-w-0">
              <p className="text-slate-900 dark:text-white text-lg font-bold leading-tight truncate">
                {user?.name || "User"}
              </p>
              <p className="text-primary text-sm font-medium leading-normal truncate">
                {user?.id?.includes('-') ? "VVIP Fan Membership" : "Basic Member"}
              </p>
            </div>
          </div>
        </div>

        {/* --- App Settings --- */}
        <div className="px-4 pt-2 pb-2">
          <h3 className="text-slate-500 dark:text-slate-400 text-sm font-bold uppercase tracking-wider px-2 pb-2">
            App Settings
          </h3>
          <div className="flex flex-col overflow-hidden rounded-2xl bg-surface-light dark:bg-surface-dark shadow-sm dark:shadow-none border border-black/5 dark:border-white/5">
            <SettingsItem
              icon="notifications"
              iconBgColor="bg-orange-400"
              label="Notification Settings"
              rightElement={
                <SettingsToggle
                  checked={notificationsEnabled}
                  onChange={setNotificationsEnabled}
                />
              }
            />
            {/* ... rest of your code ... */}
            <SettingsItem
              icon="dark_mode"
              iconBgColor="bg-indigo-500"
              label="Dark Mode"
              rightElement={
                <SettingsToggle
                  checked={darkModeEnabled}
                  onChange={setDarkModeEnabled}
                />
              }
            />
            <SettingsItem
              icon="chat_bubble"
              iconBgColor="bg-green-500"
              label="Chat Display Settings"
              href="/settings/chat"
            />
          </div>
        </div>

        {/* --- Wallet Management (Legacy) --- */}
        <div className="px-4 pt-4 pb-2">
          <h3 className="text-slate-500 dark:text-slate-400 text-sm font-bold uppercase tracking-wider px-2 pb-2">
            Advanced
          </h3>
          <div className="flex flex-col overflow-hidden rounded-2xl bg-surface-light dark:bg-surface-dark shadow-sm dark:shadow-none border border-black/5 dark:border-white/5">
            <Dialog open={exportWalletDialogOpen} onOpenChange={setExportWalletDialogOpen}>
              <button
                onClick={() => setExportWalletDialogOpen(true)}
                className="flex items-center gap-4 p-4 min-h-14 justify-between border-b border-black/5 dark:border-white/5 last:border-0 hover:bg-black/5 dark:hover:bg-white/5 transition-colors w-full text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="text-slate-500 flex items-center justify-center rounded-full bg-slate-100 shrink-0 size-8">
                    <Wallet className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col">
                    <p className="text-slate-900 dark:text-white text-base font-medium">
                      Wallet Key Management
                    </p>
                  </div>
                </div>
                <span className="material-symbols-outlined text-slate-400 dark:text-slate-500">chevron_right</span>
              </button>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Export Wallet</DialogTitle>
                  <DialogDescription>
                    View and export your wallet's private key.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <h4 className="text-sm font-semibold text-red-900 dark:text-red-100 mb-1">
                          Security Warning
                        </h4>
                        <p className="text-xs text-red-800 dark:text-red-200">
                          Your private key is strictly confidential. Never share it and keep it in a safe place.
                          Anyone who knows this key can control all assets in your wallet.
                        </p>
                      </div>
                    </div>
                  </div>

                  {!privateKey && !isLoadingPrivateKey && !exportError && (
                    <Button
                      onClick={handleExportWallet}
                      className="w-full"
                      variant="outline"
                    >
                      Load Private Key
                    </Button>
                  )}

                  {isLoadingPrivateKey && (
                    <div className="text-center py-4">
                      <p className="text-sm text-slate-500 dark:text-slate-400">Loading private key...</p>
                    </div>
                  )}

                  {exportError && (
                    <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <h4 className="text-sm font-semibold text-red-900 dark:text-red-100 mb-1">
                            Error
                          </h4>
                          <p className="text-xs text-red-800 dark:text-red-200">
                            {exportError}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {privateKey && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-slate-900 dark:text-white">
                          Private Key
                        </label>
                        <Button
                          onClick={handleCopyPrivateKey}
                          size="sm"
                          variant="outline"
                          className="h-7"
                        >
                          <Copy className="w-3 h-3 mr-1" />
                          Copy
                        </Button>
                      </div>
                      <Input
                        type="text"
                        value={privateKey}
                        readOnly
                        className="font-mono text-xs"
                      />
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Copy your private key and store it in a safe place. You can use this key to transfer assets to another wallet.
                      </p>
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setExportWalletDialogOpen(false);
                      setPrivateKey(null);
                      setExportError(null);
                    }}
                  >
                    Close
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="px-4 pt-4 pb-2">
          <h3 className="text-slate-500 dark:text-slate-400 text-sm font-bold uppercase tracking-wider px-2 pb-2">
            Privacy & Security
          </h3>
          <div className="flex flex-col overflow-hidden rounded-2xl bg-surface-light dark:bg-surface-dark shadow-sm dark:shadow-none border border-black/5 dark:border-white/5">
            <SettingsItem
              icon="lock"
              iconBgColor="bg-blue-500"
              label="Privacy Policy"
              href="/privacy"
            />
            <SettingsItem
              icon="block"
              iconBgColor="bg-rose-500"
              label="Blocked Users"
              href="/settings/blocked"
            />
          </div>
        </div>

        <div className="px-4 pt-4 pb-2">
          <h3 className="text-slate-500 dark:text-slate-400 text-sm font-bold uppercase tracking-wider px-2 pb-2">
            Support
          </h3>
          <div className="flex flex-col overflow-hidden rounded-2xl bg-surface-light dark:bg-surface-dark shadow-sm dark:shadow-none border border-black/5 dark:border-white/5">
            <SettingsItem
              icon="help"
              iconBgColor="bg-slate-500"
              label="Help / FAQ"
              href="/help"
            />
            <SettingsItem
              icon="info"
              iconBgColor="bg-teal-500"
              label="Open Source Licenses"
              href="/license"
            />
          </div>
        </div>

        <div className="px-4 pt-4 pb-8">
          <div className="flex flex-col overflow-hidden rounded-2xl bg-surface-light dark:bg-surface-dark shadow-sm dark:shadow-none border border-black/5 dark:border-white/5">
            <Dialog open={logoutDialogOpen} onOpenChange={setLogoutDialogOpen}>
              <button
                onClick={() => setLogoutDialogOpen(true)}
                className="flex items-center gap-4 p-4 min-h-14 justify-between border-b border-black/5 dark:border-white/5 last:border-0 hover:bg-black/5 dark:hover:bg-white/5 transition-colors w-full text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="text-primary flex items-center justify-center rounded-full bg-primary/10 shrink-0 size-8">
                    <span className="material-symbols-outlined text-[18px]">logout</span>
                  </div>
                  <p className="text-primary text-base font-medium flex-1 truncate">
                    Log Out
                  </p>
                </div>
              </button>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Log Out</DialogTitle>
                  <DialogDescription>
                    Are you sure you want to log out?
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setLogoutDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleLogout} variant="destructive">
                    Log Out
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Dialog open={deleteAccountDialogOpen} onOpenChange={setDeleteAccountDialogOpen}>
              <button
                onClick={() => setDeleteAccountDialogOpen(true)}
                className="flex items-center gap-4 p-4 min-h-14 justify-between border-b border-black/5 dark:border-white/5 last:border-0 hover:bg-black/5 dark:hover:bg-white/5 transition-colors w-full text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="text-slate-400 dark:text-slate-500 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 shrink-0 size-8">
                    <span className="material-symbols-outlined text-[18px]">person_off</span>
                  </div>
                  <p className="text-red-500 dark:text-red-400 text-base font-medium flex-1 truncate">
                    Delete Account
                  </p>
                </div>
              </button>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Delete Account</DialogTitle>
                  <DialogDescription>
                    Deleting your account will permanently remove all your data and cannot be undone.
                    If you want to keep your chat or memory data before leaving, please use
                    &quot;Export Context&quot; in your profile or chat settings.
                    Are you sure you want to delete your account?
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setDeleteAccountDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleDeleteAccount}
                    variant="destructive"
                    disabled={isDeletingAccount}
                  >
                    {isDeletingAccount ? "Processing..." : "Delete Account"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          <p className="text-center text-slate-400 dark:text-slate-600 text-xs mt-6">
            Version 1.2.0 (Build 302)
            <br />
            © 2024 AI Idol Chat Corp.
          </p>
        </div>
      </div>
      <BottomNavigation />
    </div>
  );
}
