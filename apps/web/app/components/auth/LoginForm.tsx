import { useState } from "react";
import { Link } from "react-router";
import { cn } from "~/lib/utils";

interface LoginFormProps {
  onSubmit?: (email: string, password: string) => void;
  onSocialLogin?: (provider: "twitter" | "google" | "kakao") => void;
  isLoading?: boolean;
  error?: string;
}

export function LoginForm({
  onSubmit,
  onSocialLogin,
  isLoading = false,
  error,
}: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSubmit && email && password) {
      onSubmit(email, password);
    }
  };

  return (
    <form className="flex flex-col gap-4 w-full" onSubmit={handleSubmit}>
      {error && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm mb-2">
          {error}
        </div>
      )}

      {/* Email Field */}
      <div className="group relative">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-primary/70 transition-colors group-focus-within:text-primary">
          <span className="material-symbols-outlined">mail</span>
        </div>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email or ID"
          className="w-full h-14 bg-surface-dark-input border border-[#67324d]/30 text-white placeholder:text-white/30 text-base font-medium rounded-2xl pl-12 pr-4 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all placeholder:font-normal"
          disabled={isLoading}
          required
        />
      </div>

      {/* Password Field */}
      <div className="group relative">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-primary/70 transition-colors group-focus-within:text-primary">
          <span className="material-symbols-outlined">lock</span>
        </div>
        <input
          type={showPassword ? "text" : "password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="w-full h-14 bg-surface-dark-input border border-[#67324d]/30 text-white placeholder:text-white/30 text-base font-medium rounded-2xl pl-12 pr-12 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all placeholder:font-normal"
          disabled={isLoading}
          required
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors focus:outline-none"
        >
          <span className="material-symbols-outlined">
            {showPassword ? "visibility" : "visibility_off"}
          </span>
        </button>
      </div>

      {/* Forgot Password */}
      <div className="flex justify-end mt-1">
        <Link
          to="/forgot-password"
          className="text-sm font-semibold text-white/60 hover:text-primary transition-colors"
        >
          Forgot Password?
        </Link>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isLoading || !email || !password}
        className="mt-4 w-full h-14 bg-primary hover:bg-[#d61c78] active:scale-[0.98] text-white text-lg font-bold rounded-2xl shadow-[0_8px_20px_-6px_rgba(238,43,140,0.4)] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? (
          <>
            <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            <span>Logging in...</span>
          </>
        ) : (
          <>
            <span>Log In</span>
            <span className="material-symbols-outlined text-[20px]">login</span>
          </>
        )}
      </button>

      {/* Social Login Area */}
      <div className="mt-8">
        <div className="relative flex items-center justify-center mb-6">
          <div className="absolute w-full h-px bg-white/10" />
          <span className="relative bg-background-dark px-4 text-xs font-medium text-white/40 uppercase tracking-widest">
            Or login with
          </span>
        </div>
        <div className="flex items-center justify-center gap-5">
          <button
            type="button"
            onClick={() => onSocialLogin?.("twitter")}
            disabled={isLoading}
            className="w-14 h-14 rounded-full bg-black border border-white/20 flex items-center justify-center hover:bg-gray-900 hover:border-white/30 hover:scale-110 transition-all duration-300 group disabled:opacity-50"
            title="Login with X (Twitter)"
          >
            <svg
              viewBox="0 0 24 24"
              className="w-6 h-6 text-white group-hover:text-white fill-current"
              aria-hidden="true"
            >
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => onSocialLogin?.("google")}
            disabled={isLoading}
            className="w-14 h-14 rounded-full bg-white border border-white/20 flex items-center justify-center hover:bg-white hover:border-white/30 hover:scale-110 transition-all duration-300 group disabled:opacity-50"
            title="Login with Google"
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => onSocialLogin?.("kakao")}
            disabled={isLoading}
            className="w-14 h-14 rounded-full bg-[#fae100] border border-[#fae100] flex items-center justify-center hover:scale-110 transition-all duration-300 shadow-[0_0_15px_rgba(250,225,0,0.2)] disabled:opacity-50"
            title="Login with Kakao"
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M12 3C6.477 3 2 6.804 2 11.5c0 2.701 1.759 5.08 4.402 6.429l-1.16 4.35 4.862-2.788c.654.091 1.32.138 1.896.138 5.523 0 10-3.804 10-8.5S17.523 3 12 3z"
                fill="#371D1E"
              />
            </svg>
          </button>
        </div>
        <p className="text-center mt-8 text-white/50 text-sm">
          Don't have an account?{" "}
          <Link to="/signup" className="text-primary font-bold hover:underline ml-1">
            Sign Up
          </Link>
        </p>
      </div>
    </form>
  );
}

