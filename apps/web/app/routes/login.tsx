import { useState } from "react";
import { useNavigate } from "react-router";
import { LoginForm } from "~/components/auth/LoginForm";
import { signIn } from "~/lib/auth-client";

export default function LoginScreen() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: signInError } = await signIn.email({
        email,
        password,
        callbackURL: "/home",
      });

      if (signInError) {
        throw new Error(signInError.message || "로그인에 실패했습니다.");
      }

      setIsLoading(false);
      navigate("/home");
    } catch (err) {
      setIsLoading(false);
      setError(err instanceof Error ? err.message : "Login failed. Please try again.");
    }
  };

  const handleSocialLogin = async (provider: "twitter" | "google" | "kakao") => {
    setIsLoading(true);
    setError(null);

    try {
      // Better Auth 1.x social login
      const { data, error: socialError } = await signIn.social({
        provider: provider as any,
        callbackURL: "/home",
      });

      if (socialError) {
        throw new Error(socialError.message || "소셜 로그인에 실패했습니다.");
      }
    } catch (err) {
      setIsLoading(false);
      setError(err instanceof Error ? err.message : "Social login failed. Please try again.");
    }
  };

  return (
    <div className="bg-background-light dark:bg-background-dark text-[#111418] dark:text-white font-display min-h-screen flex items-center justify-center overflow-hidden selection:bg-primary selection:text-white">
      {/* Main Container (Phone Form Factor) */}
      <div className="relative w-full max-w-[480px] h-screen max-h-[900px] flex flex-col bg-background-dark shadow-2xl overflow-hidden sm:rounded-[32px] sm:h-[850px] sm:border-8 sm:border-[#1a0c13]">
        {/* Header Image Area */}
        <div className="absolute top-0 w-full h-[55%] z-0">
          <div
            className="w-full h-full bg-cover bg-center transition-transform duration-700 hover:scale-105"
            style={{
              backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuDtjF4w7ZvVM4T5uqyckEeqlfUO_XmEqdkTAToLV6YuztHnBsKvVbSQSy29aR1lI28t5n7zT0EbK1OiG5ziGduV_u3oKhyMfHlWNTsTtqr_i5mcM_KFcpl0RD0w8MN2oc4JfUnMSxaSf2vUwpOlhzGC0sqGlnbzpyXg5oORX7Heq2BVT7MzctcDJCcOO9Ev5-fELndTr7h1-vmy5lYllbvuOkVkJ5FwhuADi7fMMQwwWSa0MG1y4U0QQSB1lKvViQAW8WJE8jdf53Y")',
            }}
          />
          <div className="absolute inset-0 bg-gradient-fade z-10" />
          <div className="absolute inset-0 bg-primary/10 mix-blend-overlay z-10" />
        </div>

        {/* Top Navigation (Transparent) */}
        <div className="relative z-20 flex items-center justify-between p-6">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-black/20 backdrop-blur-md text-white hover:bg-white/10 transition-colors"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div className="px-3 py-1 rounded-full bg-black/20 backdrop-blur-md border border-white/10">
            <span className="text-xs font-semibold tracking-wide uppercase text-white/80">English</span>
          </div>
        </div>

        {/* Scrollable Content Area */}
        <div className="relative z-20 flex flex-col flex-1 px-6 pb-8 overflow-y-auto no-scrollbar justify-end">
          {/* Headline Group */}
          <div className="mb-8 animate-fade-in-up">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/20 border border-primary/30 backdrop-blur-md mb-4">
              <span className="material-symbols-outlined text-primary text-[18px]">favorite</span>
              <span className="text-xs font-bold text-primary tracking-wide">AI IDOL CHAT</span>
            </div>
            <h1 className="text-4xl font-bold text-white mb-3 leading-[1.1] tracking-tight">Welcome<br />Back, Fan!</h1>
            <p className="text-white/70 text-base font-medium leading-relaxed">Login to continue your daily conversations and exclusive moments.</p>
          </div>

          <LoginForm
            onSubmit={handleLogin}
            onSocialLogin={handleSocialLogin}
            isLoading={isLoading}
            error={error || undefined}
          />
        </div>
      </div>
    </div>
  );
}

