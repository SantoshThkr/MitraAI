export type MessageRole = "user" | "assistant";

export type Message = {
  id: string;
  role: MessageRole;
  text: string;
};

export type Chat = {
  id: string;
  title: string;
  createdAt: string;
};

export type Theme = "dark" | "light";

export type User = {
  id: string;
  email: string;
  displayName: string;
};
