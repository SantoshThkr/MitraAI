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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const activeChat = chats.find((chat) => chat.id === selectedChatId) || null;

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
    <div className="main grid grid-cols-5 h-screen bg-zinc-950 text-white">
      <aside className="col-span-1 border-r border-zinc-800 p-4 flex flex-col gap-4">
        <div>
          <h1 className="text-2xl font-semibold">MitraAI</h1>
          <p className="text-sm text-zinc-400 mt-1">A New AI TOOL</p>
        </div>

        <button
          type="button"
          className="rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-left text-sm font-medium hover:bg-zinc-800"
          onClick={handleNewChat}
        >
          + New chat
        </button>

        <div className="overflow-y-auto flex-1 space-y-2 pr-1">
          {chats.length === 0 ? (
            <p className="text-sm text-zinc-500">No chats yet. Ask something to start.</p>
          ) : (
            chats.map((chat) => {
              const isActive = chat.id === selectedChatId;
              return (
                <button
                  key={chat.id}
                  type="button"
                  className={`w-full rounded-2xl px-4 py-3 text-left text-sm transition ${
                    isActive ? "bg-indigo-600 text-white" : "bg-zinc-900 text-zinc-300 hover:bg-zinc-800"
                  }`}
                  onClick={() => setSelectedChatId(chat.id)}
                >
                  <div className="truncate font-medium">{chat.title || "Untitled chat"}</div>
                  <div className="mt-1 text-xs text-zinc-500">{new Date(chat.createdAt).toLocaleString()}</div>
                </button>
              );
            })
          )}
        </div>
      </aside>

      <main className="col-span-4 p-6 flex flex-col gap-4">
        <div className="rounded-3xl bg-zinc-950 p-6 shadow-xl shadow-black/20 overflow-auto flex-1">
          {loading && <p className="text-white">Loading...</p>}
          {error && <p className="text-red-400">{error}</p>}
          {!activeChat && !loading && !error && (
            <div className="text-zinc-400">Start a new conversation by typing your question below.</div>
          )}

          {activeChat && (
            <div className="space-y-6">
                  <div className="space-y-4">
                    {activeChat.messages.map((message, index) => (
                      <div
                        key={index}
                        className={`rounded-3xl p-5 ${
                          message.role === "user" ? "bg-zinc-900" : "bg-zinc-800"
                        }`}
                      >
                        <div className="text-xs uppercase tracking-[0.2em] text-zinc-500 mb-2">
                          {message.role === "user" ? "You" : "MitraAI"}
                        </div>
                        <div className="text-base text-zinc-100 leading-relaxed">
                          <Results ans={message.text} />
                        </div>
                      </div>
                    ))}
                  </div>
            </div>
          )}
        </div>

        <div className="rounded-3xl bg-zinc-900 border border-zinc-800 p-4 flex items-center gap-4">
          <input
            type="text"
            className="w-full rounded-full border border-zinc-800 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-indigo-500"
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
