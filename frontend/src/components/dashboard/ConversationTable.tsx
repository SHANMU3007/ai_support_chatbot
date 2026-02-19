import Link from "next/link";
import { formatRelativeTime } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface Session {
  id: string;
  createdAt: Date;
  language: string;
  chatbot: { name: string; primaryColor: string };
  _count: { messages: number };
  messages: { content: string }[];
}

interface Props {
  sessions: Session[];
}

export function ConversationTable({ sessions }: Props) {
  if (sessions.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400 text-sm">
        No conversations yet
      </div>
    );
  }

  return (
    <table className="w-full">
      <thead>
        <tr className="border-b">
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Chatbot
          </th>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Last Message
          </th>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Messages
          </th>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Language
          </th>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Started
          </th>
        </tr>
      </thead>
      <tbody className="divide-y">
        {sessions.map((session) => (
          <tr key={session.id} className="hover:bg-gray-50">
            <td className="px-4 py-3">
              <Link
                href={`/conversations/${session.id}`}
                className="flex items-center gap-2 text-sm font-medium text-indigo-600 hover:underline"
              >
                <div
                  className="w-5 h-5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: session.chatbot.primaryColor }}
                />
                {session.chatbot.name}
              </Link>
            </td>
            <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">
              {session.messages[0]?.content || "No messages"}
            </td>
            <td className="px-4 py-3 text-sm text-gray-600">{session._count.messages}</td>
            <td className="px-4 py-3">
              <Badge variant="outline" className="text-xs">
                {session.language.toUpperCase()}
              </Badge>
            </td>
            <td className="px-4 py-3 text-xs text-gray-400">
              {formatRelativeTime(session.createdAt)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
