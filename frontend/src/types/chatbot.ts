export interface Chatbot {
  id: string;
  name: string;
  businessName: string;
  description?: string;
  systemPrompt: string;
  primaryColor: string;
  welcomeMessage: string;
  language: string;
  isActive: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface ChatbotWithCounts extends Chatbot {
  _count: {
    sessions: number;
    documents: number;
  };
}

export interface Document {
  id: string;
  chatbotId: string;
  name: string;
  type: "FAQ" | "PDF" | "URL" | "TEXT" | "DOCX";
  content: string;
  status: "PENDING" | "PROCESSING" | "DONE" | "FAILED";
  chunkCount: number;
  createdAt: string | Date;
}
