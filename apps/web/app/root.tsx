import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useNavigation,
} from "react-router";
import { useTranslation } from "react-i18next";
import { useState, useEffect } from "react";

import type { Route } from "./+types/root";
import "~/lib/i18n";
import "./app.css";
import { Toaster } from "~/components/ui/sonner";

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

import { MeshBackground } from "~/components/effects/mesh-background";

// ─── Splash Screen ────────────────────────────────────────────────────────────
const SPLASH_KEY = "choonsim_splash_v2";
const SPLASH_DISPLAY_MS = 2200;
const SPLASH_FADE_MS = 700;

// 모듈 레벨 플래그 — StrictMode의 unmount/remount 사이클에서도 살아남음
// useRef와 달리 컴포넌트 재마운트 시 초기화되지 않음
let _splashScheduled = false;

function SplashScreen() {
  const [phase, setPhase] = useState<"enter" | "exit" | "done">("enter");

  useEffect(() => {
    // 두 번째 실행(StrictMode) 차단
    if (_splashScheduled) return;
    _splashScheduled = true;

    // 재방문(같은 세션): 즉시 제거
    if (sessionStorage.getItem(SPLASH_KEY)) {
      setPhase("done");
      return;
    }

    // 첫 방문: 키 저장 후 타이머 실행
    // cleanup 없음 — StrictMode cleanup이 타이머를 지우면 splash가 영구 정지되므로 의도적으로 생략
    sessionStorage.setItem(SPLASH_KEY, "1");
    setTimeout(() => setPhase("exit"), SPLASH_DISPLAY_MS);
    setTimeout(() => setPhase("done"), SPLASH_DISPLAY_MS + SPLASH_FADE_MS);
  }, []);

  if (phase === "done") return null;

  return (
    <div
      className={`fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-[#221019] ${
        phase === "exit" ? "splash-exit pointer-events-none" : "splash-enter"
      }`}
      aria-hidden="true"
    >
      {/* 캐릭터 이미지 */}
      <div className="splash-image relative mb-8">
        <div className="absolute inset-0 rounded-full blur-2xl bg-primary/30 scale-110" />
        <img
          src="/illustrations/choonsim_004.jpg"
          alt="Choonsim"
          width={200}
          height={200}
          className="relative w-44 h-44 rounded-full object-cover object-top shadow-2xl ring-2 ring-primary/40"
        />
      </div>

      {/* 태그라인 */}
      <div className="text-center space-y-2 px-8">
        <p className="splash-line1 text-white/50 text-base font-medium tracking-wide">
          AI gives you answers.
        </p>
        <p className="splash-line2 text-white text-xl font-black tracking-tight">
          Choonsim gives you{" "}
          <span className="text-primary" style={{ textShadow: "0 0 20px rgba(238,43,140,0.6)" }}>
            empathy.
          </span>
        </p>
      </div>

      {/* with Solana 배지 */}
      <div className="splash-line2 absolute bottom-12 flex items-center gap-2 opacity-70">
        <span className="text-xs font-semibold tracking-widest uppercase text-white/40">
          built with
        </span>
        <span
          className="text-xs font-black tracking-wider uppercase"
          style={{
            background: "linear-gradient(90deg, #9945FF 0%, #14F195 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          Solana
        </span>
      </div>
    </div>
  );
}
// ─────────────────────────────────────────────────────────────────────────────

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
      <body className="bg-[#0a0508]">
        <MeshBackground />
        {children}
        <Toaster />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

function NavigationProgressBar() {
  const navigation = useNavigation();
  const isLoading = navigation.state === "loading";

  if (!isLoading) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] h-0.5 bg-primary/20">
      <div className="h-full bg-primary animate-progress-bar" />
    </div>
  );
}

export default function App() {
  return (
    <>
      <SplashScreen />
      <NavigationProgressBar />
      <Outlet />
    </>
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
