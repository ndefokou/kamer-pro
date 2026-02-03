import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { WebAuthService } from "@/services/webAuthService";
import Loading from "@/components/Loading";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { Eye, EyeOff, ChevronLeft } from "lucide-react";
import LanguageSwitcher from "@/components/LanguageSwitcher";

const webAuth = new WebAuthService();

// Simple retry helper with exponential backoff
const withRetry = async <T,>(fn: () => Promise<T>, attempts = 3, baseDelayMs = 600): Promise<T> => {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      // If not last attempt, wait and retry
      if (i < attempts - 1) {
        const delay = baseDelayMs * Math.pow(2, i);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }
  throw lastErr;
};

const Login = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const redirectTo = useMemo(() => params.get("redirect") || "/", [params]);
  const { login, user, loading: authLoading } = useAuth();

  const [activeTab, setActiveTab] = useState<"login" | "register">((params.get("tab") as "login" | "register") || "login");

  // Login state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Register state
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Shared state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const tab = params.get("tab");
    if (tab === "login" || tab === "register") {
      setActiveTab(tab);
    }
  }, [params]);

  useEffect(() => {
    if (user) {
      navigate(redirectTo, { replace: true });
    }
  }, [user, navigate, redirectTo]);

  const handleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      if (!loginEmail.trim() || !loginPassword) {
        setError(t("auth.enterEmailPassword"));
        return;
      }

      const authData = await withRetry(() => webAuth.login(loginEmail.trim(), loginPassword));
      if (authData.token) {
        localStorage.setItem("token", authData.token);
        localStorage.setItem("userId", authData.user_id.toString());
        localStorage.setItem("username", authData.username || "");
      }
      await login(); // Refresh session in context
      navigate(redirectTo, { replace: true });
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        (err as Error)?.message ||
        t("auth.loginFailed");
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    setLoading(true);
    setError(null);
    try {
      if (!username.trim() || !phone.trim() || !password || !email.trim() || !confirmPassword) {
        setError(t("auth.fillAllFields"));
        return;
      }

      if (password !== confirmPassword) {
        setError(t("auth.passwordsDoNotMatch"));
        return;
      }

      const authData = await withRetry(() => webAuth.register(username.trim(), password, phone.trim(), email.trim()));
      if (authData.token) {
        localStorage.setItem("token", authData.token);
        localStorage.setItem("userId", authData.user_id.toString());
        localStorage.setItem("username", authData.username || "");
      }
      await login(); // Refresh session in context
      navigate(redirectTo, { replace: true });
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        (err as Error)?.message ||
        t("auth.registrationFailed");
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return <Loading fullScreen message={t("common.loading")} />;
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4 py-10 relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => navigate(-1)}
        className="absolute top-6 left-6 rounded-full hover:bg-gray-100"
        aria-label={t("common.back")}
      >
        <ChevronLeft className="h-6 w-6" />
      </Button>
      <div className="absolute top-6 right-6">
        <LanguageSwitcher />
      </div>
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold">{t("auth.welcome")}</h1>
          <p className="text-gray-600 text-sm">{t("auth.loginSubtitle")}</p>
        </div>

        {/* Tabs */}
        <div className="flex p-1 bg-gray-100 rounded-full mb-6 w-full">
          <button
            className={`flex-1 py-2 rounded-full text-sm font-semibold ${activeTab === "login" ? "bg-white shadow" : "text-gray-600"}`}
            onClick={() => setActiveTab("login")}
          >
            {t("auth.login")}
          </button>
          <button
            className={`flex-1 py-2 rounded-full text-sm font-semibold ${activeTab === "register" ? "bg-white shadow" : "text-gray-600"}`}
            onClick={() => setActiveTab("register")}
          >
            {t("auth.register")}
          </button>
        </div>

        {/* Form */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          {activeTab === "login" ? (
            <>
              <div>
                <label className="block text-sm font-medium mb-1">{t("auth.email")}</label>
                <input
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-300"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">{t("auth.password")}</label>
                <div className="relative">
                  <input
                    type={showLoginPassword ? "text" : "password"}
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-gray-300"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showLoginPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium mb-1">{t("auth.username")}</label>
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-300"
                  placeholder="johndoe"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">{t("auth.email")}</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-300"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">{t("auth.phoneLabel")}</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-300"
                  placeholder="+237 6xx xx xx xx"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">{t("auth.password")}</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-gray-300"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">{t("auth.confirmPassword")}</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-gray-300"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            </>
          )}

          {error && <div className="text-sm text-red-600">{error}</div>}

          <div className="pt-2">
            {activeTab === "login" ? (
              <Button disabled={loading} onClick={handleLogin} className="w-full bg-gray-900 text-white hover:bg-gray-800">
                {loading ? t("auth.signingIn") : t("auth.signIn")}
              </Button>
            ) : (
              <Button disabled={loading} onClick={handleRegister} className="w-full bg-gray-900 text-white hover:bg-gray-800">
                {loading ? t("auth.creatingAccount") : t("auth.createAccount")}
              </Button>
            )}
          </div>

          <div className="text-xs text-gray-500 text-center">{t("auth.agreeTerms")}</div>
        </div>
      </div>
    </div>
  );
};

export default Login;
