import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { EmbedCodeBlock } from "@/components/chatbot/EmbedCodeBlock";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface Props {
  params: { id: string };
}

export default async function EmbedPage({ params }: Props) {
  const session = await getServerSession(authOptions);
  const userId = session!.user!.id as string;

  const chatbot = await prisma.chatbot.findFirst({
    where: { id: params.id, userId },
  });

  if (!chatbot) notFound();

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const embedSnippet = `<script 
  src="${appUrl}/embed.js" 
  data-bot-id="${chatbot.id}"
  data-color="${chatbot.primaryColor}"
  async>
</script>`;

  const iframeSnippet = `<iframe
  src="${appUrl}/chat/${chatbot.id}"
  width="400"
  height="600"
  style="border: none; border-radius: 12px; box-shadow: 0 4px 24px rgba(0,0,0,0.15);"
  title="${chatbot.name}">
</iframe>`;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-4">
        <Link href={`/chatbot/${params.id}`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Embed - {chatbot.name}</h1>
          <p className="text-gray-500 text-sm mt-1">
            Add your chatbot to any website
          </p>
        </div>
      </div>

      <div className="space-y-6">
        <div className="bg-white rounded-xl border p-6">
          <h2 className="font-semibold text-lg mb-2">Option 1: Floating Widget (Recommended)</h2>
          <p className="text-sm text-gray-600 mb-4">
            Add this single script tag to your website. A floating chat bubble will appear in the
            bottom-right corner.
          </p>
          <EmbedCodeBlock code={embedSnippet} language="html" />
        </div>

        <div className="bg-white rounded-xl border p-6">
          <h2 className="font-semibold text-lg mb-2">Option 2: Embedded iFrame</h2>
          <p className="text-sm text-gray-600 mb-4">
            Embed the chat window directly in your page layout.
          </p>
          <EmbedCodeBlock code={iframeSnippet} language="html" />
        </div>

        <div className="bg-white rounded-xl border p-6">
          <h2 className="font-semibold text-lg mb-2">Option 3: Direct Link</h2>
          <p className="text-sm text-gray-600 mb-4">
            Share this link directly with customers.
          </p>
          <EmbedCodeBlock code={`${appUrl}/chat/${chatbot.id}`} language="text" />
        </div>

        <div className="bg-indigo-50 rounded-xl border border-indigo-200 p-6">
          <h2 className="font-semibold mb-2">WordPress / Shopify</h2>
          <p className="text-sm text-gray-600">
            In WordPress, use a Custom HTML widget in the Footer. In Shopify, go to{" "}
            <strong>Online Store → Themes → Edit Code</strong> and add the script before{" "}
            <code className="text-xs bg-white px-1 rounded">&lt;/body&gt;</code>.
          </p>
        </div>
      </div>
    </div>
  );
}
