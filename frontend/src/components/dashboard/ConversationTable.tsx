import Link from "next/link";
import { formatRelativeTime } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface Session {
  id: string;
  visitorId: string;
  metadata?: any;
  createdAt: Date;
  language: string;
  chatbot: { name: string; primaryColor: string; privacyLevel?: "STANDARD" | "PII_MASKED" | "ZERO_RETENTION" };
  _count: { messages: number };
  messages: { content: string }[];
  sentiment: "POSITIVE" | "NEUTRAL" | "NEGATIVE" | null;
  needsFollowUp: boolean;
}

interface Props {
  sessions: Session[];
}

function getVisitorContact(metadata: any): { name?: string; email?: string; phone?: string } {
  if (!metadata || typeof metadata !== "object") return {};
  const name = metadata.name || metadata.fullname || metadata.user_name || metadata.userName;
  const email = metadata.email || metadata.user_email || metadata.userEmail;
  const phone = metadata.phone || metadata.mobile || metadata.phoneNumber || metadata.userPhone;
  return { name, email, phone };
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
            Visitor / Lead Details
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
            Sentiment
          </th>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Started
          </th>
        </tr>
      </thead>
      <tbody className="divide-y">
        {sessions.map((session) => {
          const isZeroRetention = session.chatbot.privacyLevel === "ZERO_RETENTION";
          const contact = getVisitorContact(session.metadata);
          const hasContactInfo = contact.name || contact.email || contact.phone;

          return (
            <tr key={session.id} className="hover:bg-gray-50 dark:hover:bg-slate-900/50">
              <td className="px-4 py-3">
                <Link
                  href={`/conversations/${session.id}`}
                  className="flex items-center gap-2 text-sm font-medium text-black dark:text-white hover:underline"
                >
                  <div 
                    className="w-5 h-5 rounded-md flex-shrink-0 shadow-2xs"
                    style={{ backgroundColor: session.chatbot.primaryColor || "#0f172a" }}
                  />
                  <span>{session.chatbot.name}</span>
                  {isZeroRetention && (
                    <span className="text-[10px] font-bold px-1.5 py-0.2 bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 rounded-sm">
                      Zero-Retention
                    </span>
                  )}
                </Link>
              </td>
              <td className="px-4 py-3 text-sm">
                {hasContactInfo ? (
                  <div className="flex flex-col">
                    {contact.name && (
                      <span className="font-semibold text-slate-900 dark:text-white text-xs">
                        👤 {contact.name}
                      </span>
                    )}
                    {contact.email && (
                      <span className="text-[11px] text-indigo-600 dark:text-indigo-400">
                        ✉ {contact.email}
                      </span>
                    )}
                    {contact.phone && (
                      <span className="text-[11px] text-emerald-600 dark:text-emerald-400">
                        📞 {contact.phone}
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs text-slate-500 font-mono bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                    Visitor #{session.visitorId}
                  </span>
                )}
              </td>
              <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 max-w-xs truncate">
                {isZeroRetention ? (
                  <span className="italic text-xs text-purple-600 dark:text-purple-400 font-medium">
                    🔒 Ephemeral (Transcripts not stored)
                  </span>
                ) : (
                  session.messages[0]?.content || "No messages"
                )}
              </td>
              <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                {isZeroRetention ? "—" : session._count.messages}
              </td>
              <td className="px-4 py-3">
                <Badge variant="outline" className="text-xs">
                  {session.language.toUpperCase()}
                </Badge>
              </td>
              <td className="px-4 py-3">
                {session.sentiment ? (
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={session.sentiment === "NEGATIVE" ? "border-red-300 text-red-700" : session.sentiment === "POSITIVE" ? "border-green-300 text-green-700" : "text-gray-600"}>
                      {session.sentiment[0] + session.sentiment.slice(1).toLowerCase()}
                    </Badge>
                    {session.needsFollowUp && <span className="text-[11px] font-medium text-red-600">Follow up</span>}
                  </div>
                ) : <span className="text-xs text-gray-400">Pending</span>}
              </td>
              <td className="px-4 py-3 text-xs text-gray-400">
                {formatRelativeTime(session.createdAt)}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

