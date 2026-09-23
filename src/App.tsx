import { useEffect, useState } from "react";
import "./App.css";
import AuthForm from "./features/auth/AuthForm";
import Dashboard from "./features/chat/Dashboard";
import { fetchCurrentUser } from "./services/api";
import type { User } from "./types/chat";

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    fetchCurrentUser()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setCheckingSession(false));
  }, []);

  if (checkingSession) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-950 text-zinc-400">
        Loading...
      </div>
    );
  }

  return user ? (
    <Dashboard user={user} onLoggedOut={() => setUser(null)} />
  ) : (
    <AuthForm onAuthenticated={setUser} />
  );
}

export default App;
