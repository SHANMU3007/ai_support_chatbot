import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface Props {
  params: { id: string };
}

export default async function PreviewPage({ params }: Props) {
  const session = await getServerSession(authOptions);
  const userId = session!.user!.id as string;

  const chatbot = await prisma.chatbot.findFirst({
    where: { id: params.id, userId },
  });

  if (!chatbot) notFound();

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-4">
        <Link href={`/chatbot/${params.id}`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Preview - {chatbot.name}</h1>
          <p className="text-gray-500 text-sm mt-1">Test your chatbot live</p>
        </div>
      </div>

      <div className="bg-gray-100 rounded-2xl border-2 border-dashed border-gray-300 p-4 relative min-h-[600px]">
        <div className="text-center text-xs text-gray-400 mb-4 font-medium">
          CHATBOT PREVIEW — This is how users see your chatbot
        </div>
        <iframe
          src={`${appUrl}/chat/${params.id}?preview=true`}
          className="w-full rounded-xl shadow-lg"
          style={{ height: "560px", border: "none" }}
          title="Chatbot Preview"
        />
      </div>

      <div className="bg-blue-50 rounded-xl border border-blue-200 p-4 text-sm text-blue-800">
        <strong>Tip:</strong> Any changes to settings or knowledge base will be reflected here.
        This is exactly how the chatbot looks when embedded on your website.
      </div>
    </div>
  );
}
