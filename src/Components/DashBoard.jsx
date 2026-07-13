import { useEffect, useState } from "react";
import { geminiApi } from "../constant";
import Results from "./Results";

const DashBoard = () => {
  const [query, setQuery] = useState("");
  const [initialChats] = useState(() => {
    if (typeof window === "undefined") return [];
    const saved = window.localStorage.getItem("mitraai-chats");
    if (!saved) return [];
    try {
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed)
        ? parsed.map((chat) => {
            const normalizedMessages = chat.messages
              ? chat.messages
              : [
                  ...(chat.query
                    ? [{ role: "user", text: String(chat.query) }]
                    : []),
                  ...(chat.response
                    ? Array.isArray(chat.response)
                      ? chat.response.map((text) => ({ role: "assistant", text: String(text) }))
                      : [{ role: "assistant", text: String(chat.response) }]
                    : []),
                ];

            return {
              ...chat,
              title:
                chat.title ||
                (typeof chat.query === "string" && chat.query.trim()
                  ? chat.query.trim().slice(0, 40)
                  : normalizedMessages[0]?.text?.slice(0, 40) || "Untitled chat"),
              createdAt: chat.createdAt || new Date().toISOString(),
              messages: normalizedMessages,
            };
          })
        : [];
    } catch {
      return [];
    }
  });
  const [chats, setChats] = useState(initialChats);
  const [selectedChatId, setSelectedChatId] = useState(() => {
    if (typeof window === "undefined") return null;
    const saved = window.localStorage.getItem("mitraai-selected-chat");
    if (saved) return Number(saved);
    return initialChats[0]?.id ?? null;
  });
  const [theme, setTheme] = useState(() => {
    if (typeof window === "undefined") return "dark";
    return window.localStorage.getItem("mitraai-theme") || "dark";
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const activeChat = chats.find((chat) => chat.id === selectedChatId) || null;

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("mitraai-theme", theme);
    document.documentElement.classList.toggle("light", theme === "light");
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  useEffect(() => {
    if (selectedChatId !== null && !chats.some((chat) => chat.id === selectedChatId)) {
      setSelectedChatId(chats[0]?.id ?? null);
    }
  }, [chats, selectedChatId]);

  useEffect(() => {
    window.localStorage.setItem("mitraai-chats", JSON.stringify(chats));
  }, [chats]);

  useEffect(() => {
    if (selectedChatId !== null) {
      window.localStorage.setItem("mitraai-selected-chat", String(selectedChatId));
    }
  }, [selectedChatId]);

  const handleNewChat = () => {
    setSelectedChatId(null);
    setQuery("");
    setError("");
  };

  const handleDeleteChat = (chatId) => {
    setChats((prev) => {
      const remaining = prev.filter((chat) => chat.id !== chatId);
      if (selectedChatId === chatId) {
        setSelectedChatId(remaining[0]?.id ?? null);
      }
      return remaining;
    });
  };

  const askQuery = async () => {
    if (!query.trim()) {
      setError("Please enter a question.");
      return;
    }

    setError("");
    setLoading(true);

    const payload = {
      contents: [
        {
          parts: [
            {
              text: query,
            },
          ],
        },
      ],
    };

    try {
      const response = await fetch(geminiApi, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`);
      }

      const json = await response.json();
      const rawText = json?.candidates?.[0]?.content?.parts?.[0]?.text || "";
      if (!rawText.trim()) {
        throw new Error("No response text returned from Gemini.");
      }

      const responseParts = rawText
        .split("* ")
        .map((item) => item.trim())
        .filter(Boolean);

      const assistantText = responseParts.length ? responseParts : [rawText.trim()];
      const userMessage = { role: "user", text: query.trim() };
      const assistantMessage = { role: "assistant", text: assistantText.join("\n") };

      if (activeChat) {
        setChats((prev) =>
          prev.map((chat) =>
            chat.id === activeChat.id
              ? {
                  ...chat,
                  title: chat.title || query.trim().slice(0, 40),
                  messages: [...(chat.messages || []), userMessage, assistantMessage],
                }
              : chat
          )
        );
      } else {
        const newChat = {
          id: Date.now(),
          title: query.trim().slice(0, 40),
          createdAt: new Date().toISOString(),
          messages: [userMessage, assistantMessage],
        };

        setChats((prev) => [newChat, ...prev]);
        setSelectedChatId(newChat.id);
      }
      setQuery("");
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`main grid grid-cols-5 h-screen transition-colors duration-200 ${
        theme === "dark" ? "bg-zinc-950 text-white" : "bg-slate-100 text-slate-900"
      }`}
    >
      <aside className="col-span-1 border-r border-zinc-800 p-4 flex flex-col gap-4">
        <div>
          <h1 className="text-2xl font-semibold">MitraAI</h1>
          <p className={`text-sm mt-1 ${theme === "dark" ? "text-zinc-400" : "text-slate-500"}`}>A New AI TOOL</p>
        </div>

        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            className={`rounded-2xl border border-zinc-700 px-4 py-3 text-left text-sm font-medium ${theme === "dark" ? "text-zinc-100" : "text-slate-900"}` }
            onClick={handleNewChat}
          >
            + New chat
          </button>
          <button
            type="button"
            className={`rounded-2xl border border-zinc-700 px-4 py-3 text-sm font-medium hover:bg-zinc-800 ${theme === "dark" ? "text-zinc-100" : "text-slate-900"}` }
            onClick={() => setTheme((prev) => (prev === "dark" ? "light" : "dark"))}
          >
            {theme === "dark" ? "Light" : "Dark"}
          </button>
        </div>
        <div className={`text-sm mt-2 ${theme === "dark" ? "text-zinc-400" : "text-slate-500"}`}>
          Manage chats and switch theme.
        </div>

        <div className="overflow-y-auto flex-1 space-y-2 pr-1">
          {chats.length === 0 ? (
            <p className={`text-sm ${theme === "dark" ? "text-zinc-500" : "text-slate-500"}`}>No chats yet. Ask something to start.</p>
          ) : (
            chats.map((chat) => {
              const isActive = chat.id === selectedChatId;
              return (
                <div
                  key={chat.id}
                  className={`group flex items-center justify-between gap-3 rounded-2xl px-4 py-3 transition ${
                    isActive
                      ? "bg-indigo-600 text-white"
                      : theme === "dark"
                      ? "bg-zinc-900 text-zinc-300 hover:bg-zinc-800"
                      : "bg-white text-slate-900 hover:bg-slate-200"
                  }`}
                  onClick={() => setSelectedChatId(chat.id)}
                >
                  <div className="min-w-0">
                    <div className="truncate font-medium">{chat.title || "Untitled chat"}</div>
                    <div className={`mt-1 text-xs ${theme === "dark" ? "text-zinc-500" : "text-slate-500"}`}>
                      {new Date(chat.createdAt).toLocaleString()}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="rounded-full border border-transparent bg-red-500/10 px-2 py-1 text-xs text-red-300 opacity-0 transition group-hover:opacity-100 hover:border-red-500 hover:bg-red-500/20"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteChat(chat.id);
                    }}
                  >
                    Delete
                  </button>
                </div>
              );
            })
          )}
        </div>
      </aside>

      <main className="col-span-4 p-6 flex flex-col gap-4">
        <div
          className={`rounded-3xl p-6 shadow-xl shadow-black/20 overflow-auto flex-1 transition-colors duration-200 ${
            theme === "dark" ? "bg-zinc-950" : "bg-white"
          }`}
        >
          {loading && <p className="text-white">Loading...</p>}
          {error && <p className="text-red-400">{error}</p>}
          {!activeChat && !loading && !error && (
            <div className={theme === "dark" ? "text-zinc-400" : "text-slate-500"}>
              Start a new conversation by typing your question below.
            </div>
          )}

          {activeChat && (
            <div className="space-y-6">
              <div className="space-y-4">
                {activeChat.messages.map((message, index) => (
                  <div
                    key={index}
                    className={`rounded-3xl p-5 ${
                      message.role === "user"
                        ? theme === "dark"
                          ? "bg-zinc-900"
                          : "bg-slate-100"
                        : theme === "dark"
                        ? "bg-zinc-800"
                        : "bg-slate-200"
                    }`}
                  >
                    <div className={`text-xs uppercase tracking-[0.2em] mb-2 ${theme === "dark" ? "text-zinc-500" : "text-slate-500"}`}>
                      {message.role === "user" ? "You" : "MitraAI"}
                    </div>
                    <div className={`text-base leading-relaxed ${theme === "dark" ? "text-zinc-100" : "text-slate-900"}`}>
                      <Results ans={message.text} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className={`rounded-3xl border p-4 flex items-center gap-4 ${
          theme === "dark" ? "bg-zinc-900 border-zinc-800" : "bg-white border-slate-300"
        }`}>
          <input
            type="text"
            className={`w-full rounded-full border px-4 py-3 outline-none focus:border-indigo-500 ${
              theme === "dark"
                ? "border-zinc-800 bg-zinc-950 text-white"
                : "border-slate-300 bg-slate-100 text-slate-900"
            }`}
            placeholder="Ask anything"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button
            type="button"
            className="rounded-full bg-indigo-600 px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-500"
            onClick={askQuery}
          >
            Search
          </button>
        </div>
      </main>
    </div>
  );
};

export default DashBoard;
