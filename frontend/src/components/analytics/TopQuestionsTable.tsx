import Link from "next/link";

interface Session {
  id: string;
  chatbot: { name: string };
  _count: { messages: number };
}

interface Props {
  sessions: Session[];
}

export function TopQuestionsTable({ sessions }: Props) {
  if (sessions.length === 0) {
    return (
      <p className="text-sm text-gray-400 text-center py-6">No conversation data yet</p>
    );
  }

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b">
          <th className="pb-2 text-left font-medium text-gray-500 text-xs">Session</th>
          <th className="pb-2 text-left font-medium text-gray-500 text-xs">Chatbot</th>
          <th className="pb-2 text-right font-medium text-gray-500 text-xs">Messages</th>
        </tr>
      </thead>
      <tbody className="divide-y">
        {sessions.map((s, i) => (
          <tr key={s.id} className="hover:bg-gray-50">
            <td className="py-2 pr-3">
              <Link
                href={`/conversations/${s.id}`}
                className="text-indigo-600 hover:underline font-mono text-xs"
              >
                #{i + 1} {s.id.slice(0, 8)}
              </Link>
            </td>
            <td className="py-2 text-gray-600">{s.chatbot.name}</td>
            <td className="py-2 text-right font-medium">{s._count.messages}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
