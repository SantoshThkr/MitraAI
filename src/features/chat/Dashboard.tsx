import { useEffect, useRef, useState } from "react";
import Citations from "../../components/Citations";
import Results from "../../components/Results";
import { THEME_STORAGE_KEY } from "../../constants";
import { useLocalStorage } from "../../hooks/useLocalStorage";
import * as api from "../../services/api";
import type {
  Chat,
  Citation,
  Message,
  StoredDocument,
  Theme,
  User,
} from "../../types/chat";

type DashboardProps = {
  user: User;
  onLoggedOut: () => void;
};

type LoadedMessages = {
  chatId: string;
  items: Message[];
};

const toErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Something went wrong.";

const Dashboard = ({ user, onLoggedOut }: DashboardProps) => {
  const [query, setQuery] = useState("");
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [loadedMessages, setLoadedMessages] = useState<LoadedMessages | null>(null);
  const [theme, setTheme] = useLocalStorage<Theme>(THEME_STORAGE_KEY, "dark");
  const [loading, setLoading] = useState(false);
  const [streamingText, setStreamingText] = useState<string | null>(null);
  const [liveSources, setLiveSources] = useState<Citation[]>([]);
  const [documents, setDocuments] = useState<StoredDocument[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loadingChats, setLoadingChats] = useState(true);
  const [error, setError] = useState("");
  const [lastQuestion, setLastQuestion] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const isDark = theme === "dark";
  const currentChatId = chats.some((chat) => chat.id === selectedChatId)
    ? selectedChatId
    : null;
  const activeChat = chats.find((chat) => chat.id === currentChatId) ?? null;
  const messagesLoaded = loadedMessages?.chatId === currentChatId;
  const messages = messagesLoaded ? loadedMessages.items : [];
  const loadingMessages = currentChatId !== null && !messagesLoaded;

  // Ignores messages for a chat the user has already navigated away from.
  const appendMessage = (chatId: string, message: Message) =>
    setLoadedMessages((previous) =>
      previous && previous.chatId === chatId
        ? { chatId, items: [...previous.items, message] }
        : previous,
    );

  useEffect(() => {
    document.documentElement.classList.toggle("light", theme === "light");
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  useEffect(() => {
    api
      .fetchChats()
      .then(setChats)
      .catch((loadError) => setError(toErrorMessage(loadError)))
      .finally(() => setLoadingChats(false));
    api
      .fetchDocuments()
      .then(setDocuments)
      .catch((loadError) => setError(toErrorMessage(loadError)));
  }, []);

  useEffect(() => {
    if (!currentChatId) {
      return;
    }
    api
      .fetchMessages(currentChatId)
      .then((items) => setLoadedMessages({ chatId: currentChatId, items }))
      .catch((loadError) => setError(toErrorMessage(loadError)));
  }, [currentChatId]);

  const handleNewChat = () => {
    setSelectedChatId(null);
    setQuery("");
    setError("");
    setSidebarOpen(false);
  };

  const handleLogout = async () => {
    try {
      await api.logout();
    } finally {
      onLoggedOut();
    }
  };

  const handleRenameChat = async (chat: Chat) => {
    const title = window.prompt("Rename chat", chat.title)?.trim();
    if (!title || title === chat.title) {
      return;
    }

    try {
      const updated = await api.renameChat(chat.id, title);
      setChats((previousChats) =>
        previousChats.map((item) => (item.id === updated.id ? updated : item)),
      );
    } catch (renameError) {
      setError(toErrorMessage(renameError));
    }
  };

  const handleDeleteChat = async (chat: Chat) => {
    if (!window.confirm(`Delete "${chat.title}"? This cannot be undone.`)) {
      return;
    }

    try {
      await api.deleteChat(chat.id);
      setChats((previousChats) => previousChats.filter((item) => item.id !== chat.id));
      if (selectedChatId === chat.id) {
        setSelectedChatId(null);
      }
    } catch (deleteError) {
      setError(toErrorMessage(deleteError));
    }
  };

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }

    setError("");
    setUploading(true);
    try {
      const uploaded = await api.uploadDocument(file);
      setDocuments((previous) => [uploaded, ...previous]);
    } catch (uploadError) {
      setError(toErrorMessage(uploadError));
      // The server keeps a failed row so the owner can see and remove it.
      api.fetchDocuments().then(setDocuments).catch(() => undefined);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDocument = async (document: StoredDocument) => {
    if (!window.confirm(`Remove "${document.filename}" and its indexed text?`)) {
      return;
    }

    try {
      await api.deleteDocument(document.id);
      setDocuments((previous) => previous.filter((item) => item.id !== document.id));
    } catch (deleteError) {
      setError(toErrorMessage(deleteError));
    }
  };

  const send = async (question: string) => {
    const trimmedQuery = question.trim();
    if (!trimmedQuery || loading) {
      return;
    }

    setError("");
    setLastQuestion(trimmedQuery);
    setLoading(true);
    setStreamingText("");
    setLiveSources([]);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      let chat = activeChat;
      if (!chat) {
        chat = await api.createChat(trimmedQuery.slice(0, 40));
        setChats((previousChats) => [chat as Chat, ...previousChats]);
        setSelectedChatId(chat.id);
        setLoadedMessages({ chatId: chat.id, items: [] });
      }

      const chatId = chat.id;
      await api.streamChat(
        chatId,
        trimmedQuery,
        {
          onUserMessage: (message) => {
            appendMessage(chatId, message);
            setQuery("");
          },
          onSources: setLiveSources,
          onToken: (text) => setStreamingText((previous) => (previous ?? "") + text),
          onDone: (message) => {
            setStreamingText(null);
            setLiveSources([]);
            appendMessage(chatId, message);
          },
        },
        controller.signal,
      );
    } catch (requestError) {
      if (!controller.signal.aborted) {
        setError(toErrorMessage(requestError));
      }
    } finally {
      abortRef.current = null;
      setStreamingText(null);
      setLiveSources([]);
      setLoading(false);
    }
  };

  const askQuery = () => {
    if (!query.trim()) {
      setError("Please enter a question.");
      return;
    }
    void send(query);
  };

  const stopGenerating = () => abortRef.current?.abort();

  const copyMessage = (text: string) => {
    navigator.clipboard?.writeText(text).catch(() => setError("Could not copy."));
  };

  const mutedText = isDark ? "text-zinc-400" : "text-slate-500";
  const borderColor = isDark ? "border-zinc-800" : "border-slate-300";
  const outlineButton = `rounded-2xl border px-4 py-3 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:opacity-50 ${
    isDark
      ? "border-zinc-700 text-zinc-100 hover:bg-zinc-800"
      : "border-slate-300 text-slate-900 hover:bg-slate-200"
  }`;

  return (
    <div
      className={`main flex h-screen flex-col transition-colors duration-200 md:flex-row ${
        isDark ? "bg-zinc-950 text-white" : "bg-slate-100 text-slate-900"
      }`}
    >
      <header
        className={`flex items-center justify-between border-b p-3 md:hidden ${borderColor}`}
      >
        <h1 className="text-xl font-semibold">MitraAI</h1>
        <button
          type="button"
          className={outlineButton}
          aria-expanded={sidebarOpen}
          onClick={() => setSidebarOpen((open) => !open)}
        >
          {sidebarOpen ? "Close" : "Menu"}
        </button>
      </header>

      <aside
        className={`${sidebarOpen ? "flex" : "hidden"} w-full flex-col gap-4 border-b p-4 md:flex md:w-72 md:shrink-0 md:border-b-0 md:border-r lg:w-80 ${borderColor}`}
      >
        <div className="hidden md:block">
          <h1 className="text-2xl font-semibold">MitraAI</h1>
          <p className={`text-sm mt-1 ${mutedText}`}>A New AI TOOL</p>
        </div>

        <div className="flex items-center justify-between gap-2">
          <button type="button" className={outlineButton} onClick={handleNewChat}>
            + New chat
          </button>
          <button
            type="button"
            className={outlineButton}
            aria-label={`Switch to ${isDark ? "light" : "dark"} theme`}
            onClick={() => setTheme((previous) => (previous === "dark" ? "light" : "dark"))}
          >
            {isDark ? "Light" : "Dark"}
          </button>
        </div>

        <div className={`flex items-center justify-between gap-2 text-sm ${mutedText}`}>
          <span className="truncate" title={user.email}>
            {user.displayName}
          </span>
          <button
            type="button"
            className={`rounded-full border px-3 py-1 text-xs transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
              isDark ? "border-zinc-700 hover:bg-zinc-800" : "border-slate-300 hover:bg-slate-200"
            }`}
            onClick={handleLogout}
          >
            Log out
          </button>
        </div>

        <section className={`border-t pt-3 ${borderColor}`}>
          <div className="flex items-center justify-between gap-2">
            <h2 className={`text-xs font-semibold uppercase tracking-wider ${mutedText}`}>
              Documents
            </h2>
            <label
              className={`cursor-pointer rounded-full border px-3 py-1 text-xs transition focus-within:ring-2 focus-within:ring-indigo-500 ${
                isDark ? "border-zinc-700 hover:bg-zinc-800" : "border-slate-300 hover:bg-slate-200"
              } ${uploading ? "opacity-50" : ""}`}
            >
              {uploading ? "Uploading..." : "+ Add"}
              <input
                type="file"
                accept=".pdf,.txt,.md"
                className="sr-only"
                disabled={uploading}
                onChange={handleUpload}
              />
            </label>
          </div>

          <div className="mt-2 max-h-36 space-y-1 overflow-y-auto">
            {documents.length === 0 ? (
              <p className={`text-xs ${mutedText}`}>
                PDF, TXT or Markdown. Uploaded files are searched when you ask a question.
              </p>
            ) : (
              documents.map((document) => (
                <div key={document.id} className="flex items-center justify-between gap-2">
                  <span className="min-w-0 truncate text-xs" title={document.filename}>
                    {document.filename}
                    {document.status !== "ready" && (
                      <span
                        className={
                          document.status === "failed" ? "text-red-400" : mutedText
                        }
                      >
                        {" "}
                        ({document.status})
                      </span>
                    )}
                  </span>
                  <button
                    type="button"
                    className="rounded-full px-2 text-xs text-red-400 hover:text-red-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                    aria-label={`Delete ${document.filename}`}
                    onClick={() => handleDeleteDocument(document)}
                  >
                    ✕
                  </button>
                </div>
              ))
            )}
          </div>
        </section>

        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
          {loadingChats ? (
            <p className={`text-sm ${mutedText}`}>Loading chats...</p>
          ) : chats.length === 0 ? (
            <p className={`text-sm ${mutedText}`}>No chats yet. Ask something to start.</p>
          ) : (
            chats.map((chat) => {
              const isActive = chat.id === currentChatId;
              return (
                <div
                  key={chat.id}
                  role="button"
                  tabIndex={0}
                  aria-current={isActive}
                  className={`group flex items-center justify-between gap-3 rounded-2xl px-4 py-3 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                    isActive
                      ? "bg-indigo-600 text-white"
                      : isDark
                        ? "bg-zinc-900 text-zinc-300 hover:bg-zinc-800"
                        : "bg-white text-slate-900 hover:bg-slate-200"
                  }`}
                  onClick={() => {
                    setSelectedChatId(chat.id);
                    setSidebarOpen(false);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setSelectedChatId(chat.id);
                      setSidebarOpen(false);
                    }
                  }}
                >
                  <div className="min-w-0">
                    <div className="truncate font-medium">{chat.title || "Untitled chat"}</div>
                    <div
                      className={`mt-1 text-xs ${
                        isActive ? "text-indigo-100" : isDark ? "text-zinc-500" : "text-slate-500"
                      }`}
                    >
                      {new Date(chat.createdAt).toLocaleString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 transition focus-within:opacity-100 group-hover:opacity-100">
                    <button
                      type="button"
                      className="rounded-full bg-zinc-500/10 px-2 py-1 text-xs hover:bg-zinc-500/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                      aria-label={`Rename ${chat.title}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        handleRenameChat(chat);
                      }}
                    >
                      Rename
                    </button>
                    <button
                      type="button"
                      className="rounded-full bg-red-500/10 px-2 py-1 text-xs text-red-300 hover:bg-red-500/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                      aria-label={`Delete ${chat.title}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        handleDeleteChat(chat);
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col gap-4 p-4 md:p-6">
        <div
          className={`flex-1 overflow-auto rounded-3xl p-4 shadow-xl shadow-black/20 transition-colors duration-200 md:p-6 ${
            isDark ? "bg-zinc-950" : "bg-white"
          }`}
          aria-live="polite"
          aria-busy={loading}
        >
          {error && (
            <div
              role="alert"
              className="mb-4 flex items-start justify-between gap-3 rounded-2xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300"
            >
              <span className="min-w-0 wrap-break-word">{error}</span>
              <div className="flex shrink-0 gap-2">
                {lastQuestion && !loading && (
                  <button
                    type="button"
                    className="rounded-full border border-red-500/40 px-3 py-1 text-xs hover:bg-red-500/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                    onClick={() => void send(lastQuestion)}
                  >
                    Retry
                  </button>
                )}
                <button
                  type="button"
                  className="rounded-full px-2 text-xs hover:text-red-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                  aria-label="Dismiss error"
                  onClick={() => setError("")}
                >
                  ✕
                </button>
              </div>
            </div>
          )}

          {loadingMessages && <p className={mutedText}>Loading messages...</p>}

          {!activeChat && !loadingMessages && (
            <div className={mutedText}>
              Start a new conversation by typing your question below.
              {documents.length > 0 && " Your uploaded documents will be searched automatically."}
            </div>
          )}

          {activeChat && (
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`group rounded-3xl p-4 md:p-5 ${
                    message.role === "user"
                      ? isDark
                        ? "bg-zinc-900"
                        : "bg-slate-100"
                      : isDark
                        ? "bg-zinc-800"
                        : "bg-slate-200"
                  }`}
                >
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span
                      className={`text-xs uppercase tracking-[0.2em] ${
                        isDark ? "text-zinc-500" : "text-slate-500"
                      }`}
                    >
                      {message.role === "user" ? "You" : "MitraAI"}
                    </span>
                    <button
                      type="button"
                      className={`rounded-full px-2 py-1 text-xs opacity-0 transition focus:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 group-hover:opacity-100 ${mutedText}`}
                      aria-label="Copy message"
                      onClick={() => copyMessage(message.text)}
                    >
                      Copy
                    </button>
                  </div>
                  <div
                    className={`text-base leading-relaxed ${
                      isDark ? "text-zinc-100" : "text-slate-900"
                    }`}
                  >
                    <Results ans={message.text} />
                  </div>
                  <Citations sources={message.sources} theme={theme} />
                </div>
              ))}

              {streamingText !== null && (
                <div
                  className={`rounded-3xl p-4 md:p-5 ${isDark ? "bg-zinc-800" : "bg-slate-200"}`}
                >
                  <div
                    className={`mb-2 text-xs uppercase tracking-[0.2em] ${
                      isDark ? "text-zinc-500" : "text-slate-500"
                    }`}
                  >
                    MitraAI {streamingText === "" ? "is thinking..." : "is typing..."}
                  </div>
                  <div
                    className={`text-base leading-relaxed ${
                      isDark ? "text-zinc-100" : "text-slate-900"
                    }`}
                  >
                    <Results ans={streamingText} />
                  </div>
                  <Citations sources={liveSources} theme={theme} />
                </div>
              )}
            </div>
          )}
        </div>

        <form
          className={`flex items-center gap-3 rounded-3xl border p-3 md:p-4 ${
            isDark ? "border-zinc-800 bg-zinc-900" : "border-slate-300 bg-white"
          }`}
          onSubmit={(event) => {
            event.preventDefault();
            askQuery();
          }}
        >
          <input
            type="text"
            aria-label="Ask a question"
            className={`w-full rounded-full border px-4 py-3 outline-none focus:border-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:opacity-60 ${
              isDark
                ? "border-zinc-800 bg-zinc-950 text-white"
                : "border-slate-300 bg-slate-100 text-slate-900"
            }`}
            placeholder="Ask anything"
            value={query}
            disabled={loading}
            onChange={(event) => setQuery(event.target.value)}
          />
          {loading ? (
            <button
              type="button"
              className="shrink-0 rounded-full bg-red-600 px-5 py-3 text-sm font-semibold text-white hover:bg-red-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
              onClick={stopGenerating}
            >
              Stop
            </button>
          ) : (
            <button
              type="submit"
              className="shrink-0 rounded-full bg-indigo-600 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 disabled:opacity-50"
              disabled={!query.trim()}
            >
              Send
            </button>
          )}
        </form>
      </main>
    </div>
  );
};

export default Dashboard;
