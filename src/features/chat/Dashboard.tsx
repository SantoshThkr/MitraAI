import { useEffect, useRef, useState } from "react";
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
  const [citations, setCitations] = useState<Citation[]>([]);
  const [documents, setDocuments] = useState<StoredDocument[]>([]);
  const [error, setError] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  const currentChatId = chats.some((chat) => chat.id === selectedChatId)
    ? selectedChatId
    : null;
  const activeChat = chats.find((chat) => chat.id === currentChatId) ?? null;
  const messages =
    loadedMessages && loadedMessages.chatId === currentChatId ? loadedMessages.items : [];

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
    api.fetchChats().then(setChats).catch((loadError) => setError(toErrorMessage(loadError)));
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

  const handleDeleteChat = async (chatId: string) => {
    try {
      await api.deleteChat(chatId);
      setChats((previousChats) => previousChats.filter((chat) => chat.id !== chatId));
      if (selectedChatId === chatId) {
        setSelectedChatId(null);
      }
    } catch (deleteError) {
      setError(toErrorMessage(deleteError));
    }
  };

  const askQuery = async () => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      setError("Please enter a question.");
      return;
    }

    setError("");
    setLoading(true);
    setStreamingText("");
    setCitations([]);

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
          onSources: setCitations,
          onToken: (text) =>
            setStreamingText((previous) => (previous ?? "") + text),
          onDone: (message) => {
            setStreamingText(null);
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
      setLoading(false);
    }
  };

  const stopGenerating = () => abortRef.current?.abort();

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }

    setError("");
    try {
      const uploaded = await api.uploadDocument(file);
      setDocuments((previous) => [uploaded, ...previous]);
      if (uploaded.status === "failed") {
        setError(`Could not index ${uploaded.filename}.`);
      }
    } catch (uploadError) {
      setError(toErrorMessage(uploadError));
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    try {
      await api.deleteDocument(documentId);
      setDocuments((previous) => previous.filter((item) => item.id !== documentId));
    } catch (deleteError) {
      setError(toErrorMessage(deleteError));
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
          className={`text-sm mt-2 flex items-center justify-between gap-2 ${
            theme === "dark" ? "text-zinc-400" : "text-slate-500"
          }`}
        >
          <span className="truncate">{user.displayName}</span>
          <button
            type="button"
            className="rounded-full border border-zinc-700 px-3 py-1 text-xs"
            onClick={handleLogout}
          >
            Log out
          </button>
        </div>

        <div
          className={`border-t border-zinc-800 pt-3 text-sm ${
            theme === "dark" ? "text-zinc-400" : "text-slate-500"
          }`}
        >
          <label className="cursor-pointer rounded-2xl border border-zinc-700 px-3 py-2 text-xs">
            + Add document
            <input
              type="file"
              accept=".pdf,.txt,.md"
              className="hidden"
              onChange={handleUpload}
            />
          </label>

          <div className="mt-2 max-h-32 space-y-1 overflow-y-auto">
            {documents.map((document) => (
              <div key={document.id} className="flex items-center justify-between gap-2">
                <span className="truncate text-xs" title={document.filename}>
                  {document.filename}
                  {document.status !== "ready" && ` (${document.status})`}
                </span>
                <button
                  type="button"
                  className="rounded-full px-2 text-xs text-red-300 hover:text-red-200"
                  onClick={() => handleDeleteDocument(document.id)}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
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
                  <div className="flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
                    <button
                      type="button"
                      className="rounded-full border border-transparent bg-zinc-500/10 px-2 py-1 text-xs hover:border-zinc-500 hover:bg-zinc-500/20"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleRenameChat(chat);
                      }}
                    >
                      Rename
                    </button>
                    <button
                      type="button"
                      className="rounded-full border border-transparent bg-red-500/10 px-2 py-1 text-xs text-red-300 hover:border-red-500 hover:bg-red-500/20"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleDeleteChat(chat.id);
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

      <main className="col-span-4 p-6 flex flex-col gap-4">
        <div
          className={`rounded-3xl p-6 shadow-xl shadow-black/20 overflow-auto flex-1 transition-colors duration-200 ${
            theme === "dark" ? "bg-zinc-950" : "bg-white"
          }`}
        >
          {loading && streamingText === null && (
            <p className="text-white">Loading...</p>
          )}
          {error && <p className="text-red-400">{error}</p>}
          {!activeChat && !loading && !error && (
            <div className={theme === "dark" ? "text-zinc-400" : "text-slate-500"}>
              Start a new conversation by typing your question below.
            </div>
          )}

          {activeChat && (
            <div className="space-y-6">
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
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

                {streamingText !== null && (
                  <div
                    className={`rounded-3xl p-5 ${
                      theme === "dark" ? "bg-zinc-800" : "bg-slate-200"
                    }`}
                  >
                    <div
                      className={`text-xs uppercase tracking-[0.2em] mb-2 ${
                        theme === "dark" ? "text-zinc-500" : "text-slate-500"
                      }`}
                    >
                      MitraAI {streamingText === "" ? "is thinking..." : "is typing..."}
                    </div>
                    <div
                      className={`text-base leading-relaxed ${
                        theme === "dark" ? "text-zinc-100" : "text-slate-900"
                      }`}
                    >
                      <Results ans={streamingText} />
                    </div>
                  </div>
                )}

                {citations.length > 0 && (
                  <div
                    className={`text-xs ${
                      theme === "dark" ? "text-zinc-500" : "text-slate-500"
                    }`}
                  >
                    Sources:{" "}
                    {citations
                      .map(
                        (citation) =>
                          citation.filename +
                          (citation.page ? ` (p. ${citation.page})` : ""),
                      )
                      .join(", ")}
                  </div>
                )}
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
            disabled={loading}
            onChange={(event) => setQuery(event.target.value)}
          />
          {loading ? (
            <button
              type="button"
              className="rounded-full bg-red-600 px-6 py-3 text-sm font-semibold text-white hover:bg-red-500"
              onClick={stopGenerating}
            >
              Stop
            </button>
          ) : (
            <button
              type="button"
              className="rounded-full bg-indigo-600 px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-500"
              onClick={askQuery}
            >
              Search
            </button>
          )}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
