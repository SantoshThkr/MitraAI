import type { Chat, Message } from "../types/chat";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const toMessage = (value: unknown, role: Message["role"]): Message | null => {
  if (!isRecord(value) || typeof value.text !== "string") {
    return null;
  }
  return { role, text: value.text };
};

const normalizeChat = (value: unknown): Chat | null => {
  if (!isRecord(value)) {
    return null;
  }

  const messages = Array.isArray(value.messages)
    ? value.messages
        .map((message) => {
          if (!isRecord(message) || typeof message.role !== "string") {
            return null;
          }
          return toMessage(message, message.role === "user" ? "user" : "assistant");
        })
        .filter((message): message is Message => message !== null)
    : [
        ...(typeof value.query === "string"
          ? [{ role: "user" as const, text: value.query }]
          : []),
        ...(Array.isArray(value.response)
          ? value.response.map((text) => ({
              role: "assistant" as const,
              text: String(text),
            }))
          : typeof value.response === "string"
            ? [{ role: "assistant" as const, text: value.response }]
            : []),
      ];

  const firstMessageText = messages[0]?.text;
  const title =
    typeof value.title === "string" && value.title
      ? value.title
      : typeof value.query === "string" && value.query.trim()
        ? value.query.trim().slice(0, 40)
        : firstMessageText?.slice(0, 40) || "Untitled chat";

  return {
    id: typeof value.id === "number" ? value.id : Date.now(),
    title,
    createdAt:
      typeof value.createdAt === "string"
        ? value.createdAt
        : new Date().toISOString(),
    messages,
  };
};

export const normalizeChats = (value: unknown): Chat[] =>
  Array.isArray(value)
    ? value
        .map(normalizeChat)
        .filter((chat): chat is Chat => chat !== null)
    : [];

export const createChat = (messages: Message[], title: string): Chat => ({
  id: Date.now(),
  title: title.slice(0, 40),
  createdAt: new Date().toISOString(),
  messages,
});
