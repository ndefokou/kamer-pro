import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { WebAuthService } from "@/services/webAuthService";
import { Button } from "@/components/ui/button";

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

const WebAuthLogin = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const redirectTo = useMemo(() => params.get("redirect") || "/", [params]);

  const [activeTab, setActiveTab] = useState<"login" | "register">("login");

  // Shared state
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Register state
  const [email, setEmail] = useState("");

  useEffect(() => {
    // If already logged in, bounce to redirect
    const token = localStorage.getItem("token");
    if (token) navigate(redirectTo, { replace: true });
  }, [navigate, redirectTo]);

  const finishLogin = (token: string, user_id: number, uname: string, email?: string) => {
    localStorage.setItem("token", token);
    localStorage.setItem("userId", String(user_id));
    localStorage.setItem("username", uname);
    if (email) localStorage.setItem("email", email);
    navigate(redirectTo || "/", { replace: true });
  };

  const handleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      if (!username.trim() || !password) {
        setError("Please enter username and password");
        return;
      }

      const complete = await withRetry(() => webAuth.login(username.trim(), password));
      finishLogin(complete.token, complete.user_id, complete.username, complete.email);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        (err as Error)?.message ||
        "Login failed";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    setLoading(true);
    setError(null);
    try {
      if (!username.trim() || !email.trim() || !password) {
        setError("Please enter username, email and password");
        return;
      }

      const complete = await withRetry(() => webAuth.register(username.trim(), email.trim(), password));
      finishLogin(complete.token, complete.user_id, complete.username, complete.email);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        (err as Error)?.message ||
        "Registration failed";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold">Welcome</h1>
          <p className="text-gray-600 text-sm">Login or create an account to become a host</p>
        </div>

        {/* Tabs */}
        <div className="flex p-1 bg-gray-100 rounded-full mb-6 w-full">
          <button
            className={`flex-1 py-2 rounded-full text-sm font-semibold ${activeTab === "login" ? "bg-white shadow" : "text-gray-600"}`}
            onClick={() => setActiveTab("login")}
          >
            Login
          </button>
          <button
            className={`flex-1 py-2 rounded-full text-sm font-semibold ${activeTab === "register" ? "bg-white shadow" : "text-gray-600"}`}
            onClick={() => setActiveTab("register")}
          >
            Register
          </button>
        </div>

        {/* Form */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Username</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-300"
              placeholder="johndoe"
            />
          </div>

          {activeTab === "register" && (
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-300"
                placeholder="john@example.com"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-300"
              placeholder="••••••••"
            />
          </div>

          {error && <div className="text-sm text-red-600">{error}</div>}

          <div className="pt-2">
            {activeTab === "login" ? (
              <Button disabled={loading} onClick={handleLogin} className="w-full bg-gray-900 text-white hover:bg-gray-800">
                {loading ? "Signing in..." : "Sign in"}
              </Button>
            ) : (
              <Button disabled={loading} onClick={handleRegister} className="w-full bg-gray-900 text-white hover:bg-gray-800">
                {loading ? "Creating account..." : "Create account"}
              </Button>
            )}
          </div>

          <div className="text-xs text-gray-500 text-center">By continuing you agree to our Terms and Privacy Policy.</div>
        </div>
      </div>
    </div>
  );
};

export default WebAuthLogin;
