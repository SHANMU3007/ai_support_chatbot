import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { DocumentUploader } from "@/components/knowledge/DocumentUploader";
import { FAQEditor } from "@/components/knowledge/FAQEditor";
import { URLScraper } from "@/components/knowledge/URLScraper";
import { DocumentList } from "@/components/knowledge/DocumentList";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Upload, HelpCircle, Globe, Layers, Bot, Settings } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface Props {
  params: { id: string };
}

export default async function TrainingPage({ params }: Props) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    redirect("/login");
  }
  const userId = (session.user as any).id as string;
  if (!userId) {
    redirect("/login");
  }

  const isAdmin = (session.user as any).role === "ADMIN";
  const userEmail = session.user?.email?.toLowerCase();
  const where = isAdmin
    ? { id: params.id }
    : {
        id: params.id,
        OR: [
          { userId },
          ...(userEmail ? [{ user: { email: userEmail } }] : []),
        ],
      };

  const chatbot = await prisma.chatbot.findFirst({
    where,
    include: {
      documents: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!chatbot) notFound();

  const doneCount = chatbot.documents.filter(
    (d) => d.status === "DONE"
  ).length;
  const totalChunks = chatbot.documents.reduce(
    (sum, d) => sum + (d.chunkCount || 0),
    0
  );

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href={`/chatbot/${params.id}`}>
            <Button variant="ghost" size="sm" className="rounded-lg">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Training — {chatbot.name}
            </h1>
            <p className="text-gray-500 text-sm mt-0.5">
              Upload documents, FAQs, or URLs to teach your chatbot
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link href={`/chatbot/${params.id}/preview`}>
            <Button className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-9 shadow-sm gap-1.5">
              <Bot className="h-4 w-4" />
              Test Chatbot
            </Button>
          </Link>
          <Link href={`/chatbot/${params.id}/settings`}>
            <Button variant="outline" className="rounded-xl border-gray-200 text-gray-700 hover:bg-gray-50 text-xs h-9 gap-1.5 font-medium">
              <Settings className="h-4 w-4 text-gray-500" />
              Settings
            </Button>
          </Link>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <Layers className="h-4 w-4 text-black" />
            Documents
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {chatbot.documents.length}
          </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <span className="w-2 h-2 rounded-full bg-black" />
            Ready
          </div>
          <p className="text-2xl font-bold text-black">{doneCount}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <span className="w-2 h-2 rounded-full bg-gray-400" />
            Knowledge Chunks
          </div>
          <p className="text-2xl font-bold text-gray-900">{totalChunks}</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="upload">
        <TabsList className="bg-gray-100/80 p-1 rounded-xl">
          <TabsTrigger
            value="upload"
            className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm gap-2"
          >
            <Upload className="h-4 w-4" />
            Upload Files
          </TabsTrigger>
          <TabsTrigger
            value="faq"
            className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm gap-2"
          >
            <HelpCircle className="h-4 w-4" />
            FAQ Editor
          </TabsTrigger>
          <TabsTrigger
            value="url"
            className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm gap-2"
          >
            <Globe className="h-4 w-4" />
            Scrape URL
          </TabsTrigger>
          <TabsTrigger
            value="docs"
            className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm gap-2"
          >
            <Layers className="h-4 w-4" />
            All Docs ({chatbot.documents.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="mt-5">
          <DocumentUploader chatbotId={params.id} />
        </TabsContent>

        <TabsContent value="faq" className="mt-5">
          <FAQEditor chatbotId={params.id} />
        </TabsContent>

        <TabsContent value="url" className="mt-5">
          <URLScraper chatbotId={params.id} />
        </TabsContent>

        <TabsContent value="docs" className="mt-5">
          <DocumentList
            documents={chatbot.documents as any}
            chatbotId={params.id}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
