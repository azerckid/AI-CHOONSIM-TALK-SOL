// Buffer polyfill — Privy embedded wallet requires Node.js Buffer in browser
import { Buffer } from "buffer";
if (typeof globalThis.Buffer === "undefined") {
  globalThis.Buffer = Buffer;
}

import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";
import { useTranslation } from "react-i18next";

import type { Route } from "./+types/root";
import "~/lib/i18n";
import "./app.css";
import { Toaster } from "~/components/ui/sonner";
import { SolanaWalletProvider } from "~/components/solana/SolanaWalletProvider";
import { PrivyWalletProvider } from "~/components/solana/PrivyWalletProvider";

export const links: Route.LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
  },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <meta charSet="utf-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=5, viewport-fit=cover, user-scalable=yes"
        />
        <meta name="theme-color" content="#ee2b8c" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <Toaster />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return (
    <PrivyWalletProvider>
      <SolanaWalletProvider>
        <Outlet />
      </SolanaWalletProvider>
    </PrivyWalletProvider>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  const { t } = useTranslation();
  let message = t("error.oops");
  let details = t("error.unknown");
  let goHome = t("error.goHome");
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    if (error.status === 404) {
      message = "404";
      details = t("error.notFoundDesc");
    } else if (error.status === 403) {
      message = t("error.forbidden");
      details = t("error.forbiddenDesc");
    } else if (error.status === 401) {
      message = t("error.unauthorized");
      details = t("error.unauthorizedDesc");
    } else {
      message = error.status.toString();
      details = error.statusText || t("error.serverError");
    }
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#0B0A10] text-white font-sans">
      <div className="max-w-md w-full text-center space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="w-24 h-24 rounded-[32px] bg-white/5 border border-white/10 flex items-center justify-center mx-auto shadow-2xl shadow-primary/10">
          <span className="material-symbols-outlined text-primary text-5xl">
            {isRouteErrorResponse(error) && error.status === 403 ? "lock_person" : "warning"}
          </span>
        </div>

        <div className="space-y-2">
          <h1 className="text-4xl font-black italic tracking-tighter uppercase leading-none">
            {message}
          </h1>
          <p className="text-white/40 font-medium text-sm leading-relaxed">
            {details}
          </p>
        </div>

        <div className="pt-4">
          <a
            href="/"
            className="inline-flex items-center gap-2 px-8 py-4 bg-primary text-black rounded-2xl font-black italic text-sm tracking-tighter hover:scale-105 transition-all shadow-[0_10px_30px_rgba(255,0,255,0.3)]"
          >
            {goHome}
          </a>
        </div>

        {stack && (
          <div className="mt-12 text-left">
            <details className="group">
              <summary className="text-[10px] font-black text-white/10 cursor-pointer hover:text-white/30 transition-all uppercase tracking-widest list-none text-center">
                Developer Debug Info
              </summary>
              <pre className="mt-4 p-6 bg-black/40 border border-white/5 rounded-3xl text-[10px] text-primary/60 overflow-x-auto font-mono leading-relaxed">
                <code>{stack}</code>
              </pre>
            </details>
          </div>
        )}
      </div>
    </main>
  );
}
