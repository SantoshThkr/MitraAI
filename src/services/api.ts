import type {
  Chat,
  Citation,
  Message,
  MessageRole,
  StoredDocument,
  User,
} from "../types/chat";

type UserPayload = {
  id: string;
  email: string;
  display_name: string;
};

type ConversationPayload = {
  id: string;
  title: string;
  created_at: string;
};

type MessagePayload = {
  id: string;
  role: MessageRole;
  content: string;
};

const failure = async (response: Response): Promise<Error> => {
  const detail = await response
    .json()
    .then((body: { detail?: unknown }) =>
      typeof body.detail === "string" ? body.detail : null,
    )
    .catch(() => null);
  return new Error(detail ?? `Request failed: ${response.status}`);
};

const request = async <T>(path: string, init: RequestInit = {}): Promise<T> => {
  const response = await fetch(`/api${path}`, {
    ...init,
    credentials: "include",
    headers: init.body ? { "Content-Type": "application/json" } : undefined,
  });

  if (!response.ok) {
    throw await failure(response);
  }

  return response.status === 204 ? (undefined as T) : ((await response.json()) as T);
};

const toUser = (payload: UserPayload): User => ({
  id: payload.id,
  email: payload.email,
  displayName: payload.display_name,
});

const toChat = (payload: ConversationPayload): Chat => ({
  id: payload.id,
  title: payload.title,
  createdAt: payload.created_at,
});

const toMessage = (payload: MessagePayload): Message => ({
  id: payload.id,
  role: payload.role,
  text: payload.content,
});

export const signup = async (
  email: string,
  displayName: string,
  password: string,
): Promise<User> =>
  toUser(
    await request<UserPayload>("/auth/signup", {
      method: "POST",
      body: JSON.stringify({ email, display_name: displayName, password }),
    }),
  );

export const login = async (email: string, password: string): Promise<User> =>
  toUser(
    await request<UserPayload>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  );

export const logout = (): Promise<void> =>
  request<void>("/auth/logout", { method: "POST" });

export const fetchCurrentUser = async (): Promise<User> =>
  toUser(await request<UserPayload>("/auth/me"));

export const fetchChats = async (): Promise<Chat[]> =>
  (await request<ConversationPayload[]>("/conversations")).map(toChat);

export const createChat = async (title: string): Promise<Chat> =>
  toChat(
    await request<ConversationPayload>("/conversations", {
      method: "POST",
      body: JSON.stringify({ title }),
    }),
  );

export const renameChat = async (chatId: string, title: string): Promise<Chat> =>
  toChat(
    await request<ConversationPayload>(`/conversations/${chatId}`, {
      method: "PATCH",
      body: JSON.stringify({ title }),
    }),
  );

export const deleteChat = (chatId: string): Promise<void> =>
  request<void>(`/conversations/${chatId}`, { method: "DELETE" });

export const fetchMessages = async (chatId: string): Promise<Message[]> =>
  (await request<MessagePayload[]>(`/conversations/${chatId}/messages`)).map(toMessage);

export const fetchDocuments = (): Promise<StoredDocument[]> =>
  request<StoredDocument[]>("/documents");

export const uploadDocument = async (file: File): Promise<StoredDocument> => {
  const body = new FormData();
  body.append("file", file);

  const response = await fetch("/api/documents", {
    method: "POST",
    credentials: "include",
    body,
  });

  if (!response.ok) {
    throw await failure(response);
  }

  return (await response.json()) as StoredDocument;
};

export const deleteDocument = (documentId: string): Promise<void> =>
  request<void>(`/documents/${documentId}`, { method: "DELETE" });

type ChatStreamEvent =
  | { type: "user_message"; message: MessagePayload }
  | { type: "sources"; sources: Citation[] }
  | { type: "token"; text: string }
  | { type: "done"; message: MessagePayload }
  | { type: "error"; detail: string };

type ChatStreamHandlers = {
  onUserMessage: (message: Message) => void;
  onSources: (sources: Citation[]) => void;
  onToken: (text: string) => void;
  onDone: (message: Message) => void;
};

export const streamChat = async (
  chatId: string,
  content: string,
  handlers: ChatStreamHandlers,
  signal: AbortSignal,
): Promise<void> => {
  const response = await fetch(`/api/conversations/${chatId}/chat`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
    signal,
  });

  if (!response.ok) {
    throw await failure(response);
  }
  if (!response.body) {
    throw new Error("The server returned an empty stream.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const frames = buffer.split("\n\n");
    buffer = frames.pop() ?? "";

    for (const frame of frames) {
      const line = frame.split("\n").find((item) => item.startsWith("data: "));
      if (!line) {
        continue;
      }

      const event = JSON.parse(line.slice(6)) as ChatStreamEvent;
      if (event.type === "user_message") {
        handlers.onUserMessage(toMessage(event.message));
      } else if (event.type === "sources") {
        handlers.onSources(event.sources);
      } else if (event.type === "token") {
        handlers.onToken(event.text);
      } else if (event.type === "done") {
        handlers.onDone(toMessage(event.message));
      } else {
        throw new Error(event.detail);
      }
    }
  }
};
