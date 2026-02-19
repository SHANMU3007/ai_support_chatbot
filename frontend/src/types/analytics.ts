export interface DailyMessageData {
  date: string;
  messages: number;
}

export interface AnalyticsStats {
  totalSessions: number;
  totalMessages: number;
  totalChatbots: number;
  recentSessions: number;
}

export interface NLQueryResult {
  sql: string;
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
}
