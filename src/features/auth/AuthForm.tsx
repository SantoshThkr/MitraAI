import { useState } from "react";
import { login, signup } from "../../services/api";
import type { User } from "../../types/chat";

type AuthFormProps = {
  onAuthenticated: (user: User) => void;
};

const AuthForm = ({ onAuthenticated }: AuthFormProps) => {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const isSignup = mode === "signup";

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const user = isSignup
        ? await signup(email.trim(), displayName.trim(), password)
        : await login(email.trim(), password);
      onAuthenticated(user);
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "Something went wrong.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-zinc-950 text-white">
      <form
        className="w-full max-w-sm space-y-4 rounded-3xl border border-zinc-800 bg-zinc-900 p-8"
        onSubmit={handleSubmit}
      >
        <div>
          <h1 className="text-2xl font-semibold">MitraAI</h1>
          <p className="mt-1 text-sm text-zinc-400">
            {isSignup ? "Create your account" : "Sign in to continue"}
          </p>
        </div>

        <input
          type="email"
          required
          className="w-full rounded-full border border-zinc-800 bg-zinc-950 px-4 py-3 outline-none focus:border-indigo-500"
          placeholder="Email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />

        {isSignup && (
          <input
            type="text"
            required
            maxLength={100}
            className="w-full rounded-full border border-zinc-800 bg-zinc-950 px-4 py-3 outline-none focus:border-indigo-500"
            placeholder="Display name"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
          />
        )}

        <input
          type="password"
          required
          minLength={isSignup ? 8 : undefined}
          className="w-full rounded-full border border-zinc-800 bg-zinc-950 px-4 py-3 outline-none focus:border-indigo-500"
          placeholder={isSignup ? "Password (min 8 characters)" : "Password"}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-full bg-indigo-600 px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
        >
          {loading ? "Please wait..." : isSignup ? "Sign up" : "Log in"}
        </button>

        <button
          type="button"
          className="w-full text-sm text-zinc-400 hover:text-zinc-200"
          onClick={() => {
            setMode(isSignup ? "login" : "signup");
            setError("");
          }}
        >
          {isSignup ? "Already have an account? Log in" : "Need an account? Sign up"}
        </button>
      </form>
    </div>
  );
};

export default AuthForm;
