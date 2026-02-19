export interface Message {
  id: string;
  sessionId: string;
  role: "USER" | "ASSISTANT";
  content: string;
  tokens?: number;
  confidence?: number;
  createdAt: string;
}

export interface ChatSession {
  id: string;
  chatbotId: string;
  visitorId: string;
  language: string;
  createdAt: string;
  updatedAt: string;
  messages?: Message[];
  _count?: { messages: number };
}
