export type MessageRole = "user" | "assistant";

export type Message = {
  role: MessageRole;
  text: string;
};

export type Chat = {
  id: number;
  title: string;
  createdAt: string;
  messages: Message[];
};

export type Theme = "dark" | "light";
