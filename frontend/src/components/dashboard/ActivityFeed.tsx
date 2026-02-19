import Link from "next/link";
import { formatRelativeTime } from "@/lib/utils";
import { MessageSquare } from "lucide-react";

interface Session {
  id: string;
  createdAt: Date;
  chatbot: { name: string };
  messages: { content: string }[];
}

interface Props {
  sessions: Session[];
}

export function ActivityFeed({ sessions }: Props) {
  return (
    <div className="bg-white rounded-xl border p-6">
      <h2 className="font-semibold mb-4 flex items-center gap-2">
        <MessageSquare className="h-4 w-4 text-indigo-600" />
        Recent Conversations
      </h2>

      {sessions.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-6">
          No conversations yet
        </p>
      ) : (
        <ul className="space-y-3">
          {sessions.map((session) => (
            <li key={session.id}>
              <Link
                href={`/conversations/${session.id}`}
                className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors group"
              >
                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                  <MessageSquare className="h-3.5 w-3.5 text-indigo-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-800">
                      {session.chatbot.name}
                    </span>
                    <span className="text-xs text-gray-400">
                      {formatRelativeTime(session.createdAt)}
                    </span>
                  </div>
                  {session.messages[0] && (
                    <p className="text-xs text-gray-500 mt-0.5 truncate">
                      {session.messages[0].content}
                    </p>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
