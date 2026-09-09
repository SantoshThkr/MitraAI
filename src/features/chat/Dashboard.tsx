import { useEffect, useState } from "react";
import Results from "../../components/Results";
import {
  CHAT_STORAGE_KEY,
  SELECTED_CHAT_STORAGE_KEY,
  THEME_STORAGE_KEY,
} from "../../constants";
import { useLocalStorage } from "../../hooks/useLocalStorage";
import { askGemini } from "../../services/geminiService";
import type { Chat, Message, Theme } from "../../types/chat";
import { createChat, normalizeChats } from "../../utils/chat";

const Dashboard = () => {
  const [query, setQuery] = useState("");
  const [chats, setChats] = useLocalStorage<Chat[]>(
    CHAT_STORAGE_KEY,
    [],
    normalizeChats,
  );
  const [selectedChatId, setSelectedChatId] = useLocalStorage<number | null>(
    SELECTED_CHAT_STORAGE_KEY,
    () => chats[0]?.id ?? null,
  );
  const [theme, setTheme] = useLocalStorage<Theme>(THEME_STORAGE_KEY, "dark");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const currentChatId = chats.some((chat) => chat.id === selectedChatId)
    ? selectedChatId
    : (chats[0]?.id ?? null);
  const activeChat = chats.find((chat) => chat.id === currentChatId) ?? null;

  useEffect(() => {
    document.documentElement.classList.toggle("light", theme === "light");
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  const handleNewChat = () => {
    setSelectedChatId(null);
    setQuery("");
    setError("");
  };

  const handleDeleteChat = (chatId: number) => {
    setChats((previousChats) => {
      const remainingChats = previousChats.filter((chat) => chat.id !== chatId);
      if (selectedChatId === chatId) {
        setSelectedChatId(remainingChats[0]?.id ?? null);
      }
      return remainingChats;
    });
  };

  const askQuery = async () => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      setError("Please enter a question.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const assistantText = await askGemini(trimmedQuery);
      const userMessage: Message = { role: "user", text: trimmedQuery };
      const assistantMessage: Message = {
        role: "assistant",
        text: assistantText,
      };

      if (activeChat) {
        setChats((previousChats) =>
          previousChats.map((chat) =>
            chat.id === activeChat.id
              ? {
                  ...chat,
                  title: chat.title || trimmedQuery.slice(0, 40),
                  messages: [...chat.messages, userMessage, assistantMessage],
                }
              : chat,
          ),
        );
      } else {
        const newChat = createChat([userMessage, assistantMessage], trimmedQuery);
        setChats((previousChats) => [newChat, ...previousChats]);
        setSelectedChatId(newChat.id);
      }
      setQuery("");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Something went wrong.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`main grid grid-cols-5 h-screen transition-colors duration-200 ${
        theme === "dark"
          ? "bg-zinc-950 text-white"
          : "bg-slate-100 text-slate-900"
      }`}
    >
      <aside className="col-span-1 border-r border-zinc-800 p-4 flex flex-col gap-4">
        <div>
          <h1 className="text-2xl font-semibold">MitraAI</h1>
          <p
            className={`text-sm mt-1 ${
              theme === "dark" ? "text-zinc-400" : "text-slate-500"
            }`}
          >
            A New AI TOOL
          </p>
        </div>

        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            className={`rounded-2xl border border-zinc-700 px-4 py-3 text-left text-sm font-medium ${
              theme === "dark" ? "text-zinc-100" : "text-slate-900"
            }`}
            onClick={handleNewChat}
          >
            + New chat
          </button>
          <button
            type="button"
            className={`rounded-2xl border border-zinc-700 px-4 py-3 text-sm font-medium hover:bg-zinc-800 ${
              theme === "dark" ? "text-zinc-100" : "text-slate-900"
            }`}
            onClick={() =>
              setTheme((previousTheme) =>
                previousTheme === "dark" ? "light" : "dark",
              )
            }
          >
            {theme === "dark" ? "Light" : "Dark"}
          </button>
        </div>
        <div
          className={`text-sm mt-2 ${
            theme === "dark" ? "text-zinc-400" : "text-slate-500"
          }`}
        >
          Manage chats and switch theme.
        </div>

        <div className="overflow-y-auto flex-1 space-y-2 pr-1">
          {chats.length === 0 ? (
            <p
              className={`text-sm ${
                theme === "dark" ? "text-zinc-500" : "text-slate-500"
              }`}
            >
              No chats yet. Ask something to start.
            </p>
          ) : (
            chats.map((chat) => {
              const isActive = chat.id === currentChatId;
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
                    <div className="truncate font-medium">
                      {chat.title || "Untitled chat"}
                    </div>
                    <div
                      className={`mt-1 text-xs ${
                        theme === "dark"
                          ? "text-zinc-500"
                          : "text-slate-500"
                      }`}
                    >
                      {new Date(chat.createdAt).toLocaleString()}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="rounded-full border border-transparent bg-red-500/10 px-2 py-1 text-xs text-red-300 opacity-0 transition group-hover:opacity-100 hover:border-red-500 hover:bg-red-500/20"
                    onClick={(event) => {
                      event.stopPropagation();
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
                    key={`${activeChat.id}-${index}`}
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
                    <div
                      className={`text-xs uppercase tracking-[0.2em] mb-2 ${
                        theme === "dark"
                          ? "text-zinc-500"
                          : "text-slate-500"
                      }`}
                    >
                      {message.role === "user" ? "You" : "MitraAI"}
                    </div>
                    <div
                      className={`text-base leading-relaxed ${
                        theme === "dark"
                          ? "text-zinc-100"
                          : "text-slate-900"
                      }`}
                    >
                      <Results ans={message.text} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div
          className={`rounded-3xl border p-4 flex items-center gap-4 ${
            theme === "dark"
              ? "bg-zinc-900 border-zinc-800"
              : "bg-white border-slate-300"
          }`}
        >
          <input
            type="text"
            className={`w-full rounded-full border px-4 py-3 outline-none focus:border-indigo-500 ${
              theme === "dark"
                ? "border-zinc-800 bg-zinc-950 text-white"
                : "border-slate-300 bg-slate-100 text-slate-900"
            }`}
            placeholder="Ask anything"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
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

export default Dashboard;
