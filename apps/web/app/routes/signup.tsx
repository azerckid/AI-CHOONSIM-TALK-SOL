import { useState } from "react";
import { useNavigate } from "react-router";
import { SignUpForm } from "~/components/auth/SignUpForm";
import { signUp } from "~/lib/auth-client";

export default function SignUpScreen() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignUp = async (email: string, nickname: string, password: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: signUpError } = await signUp.email({
        email,
        password,
        name: nickname,
      });

      if (signUpError) {
        throw new Error(signUpError.message || "회원가입에 실패했습니다.");
      }

      setIsLoading(false);
      // 성공 시 CHOCO 온보딩 슬라이드로 이동 후 홈 진입
      navigate("/onboarding/choco");
    } catch (err) {
      setIsLoading(false);
      setError(err instanceof Error ? err.message : "Sign up failed. Please try again.");
    }
  };

  return (
    <div className="bg-background-light dark:bg-background-dark font-display antialiased text-slate-900 dark:text-white">
      <div className="relative flex h-full min-h-screen w-full flex-col max-w-md mx-auto overflow-x-hidden shadow-2xl">
        {/* Header */}
        <header className="sticky top-0 z-10 flex items-center bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-md p-4 pb-2 justify-between">
          <button
            onClick={() => navigate(-1)}
            className="text-slate-900 dark:text-white flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          >
            <span className="material-symbols-outlined text-[24px]">arrow_back_ios_new</span>
          </button>
          <h2 className="text-slate-900 dark:text-white text-lg font-bold leading-tight tracking-[-0.015em] flex-1 text-center pr-10">Sign Up</h2>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 flex flex-col px-6 pt-2 pb-10">
          {/* Hero / Visual Hint */}
          <div className="relative w-full h-32 mb-6 rounded-2xl overflow-hidden group">
            <div className="absolute inset-0 bg-linear-to-r from-primary/20 via-primary/10 to-transparent" />
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/40 rounded-full blur-3xl" />
            <div className="absolute top-10 left-10 w-20 h-20 bg-purple-500/30 rounded-full blur-2xl" />
            <div className="relative h-full flex items-center px-6">
              <div className="size-16 rounded-full border-2 border-primary/50 overflow-hidden shadow-[0_0_15px_rgba(238,43,140,0.4)]">
                <img
                  alt="AI Idol Avatar Abstract"
                  className="w-full h-full object-cover"
                  src="/illustrations/rina.png"
                />
              </div>
              <div className="ml-4 flex flex-col justify-center">
                <span className="text-xs font-bold text-primary uppercase tracking-wider mb-1">Join the Fanbase</span>
                <p className="text-sm text-slate-600 dark:text-text-muted">Unlock exclusive chats & content.</p>
              </div>
            </div>
          </div>

          {/* Text Header */}
          <div className="mb-6">
            <h2 className="text-slate-900 dark:text-white tracking-tight text-[28px] font-bold leading-tight mb-2">Create your account</h2>
            <p className="text-slate-500 dark:text-text-muted text-base font-normal leading-relaxed">
              Start your journey with your AI today. She's waiting to meet you.
            </p>
          </div>

          {/* Form */}
          <SignUpForm
            onSubmit={handleSignUp}
            isLoading={isLoading}
            error={error || undefined}
          />
        </div>

        {/* Bottom spacing for iOS home indicator */}
        <div className="h-6 w-full" />
      </div>
    </div>
  );
}

