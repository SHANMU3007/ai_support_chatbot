import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { DocumentUploader } from "@/components/knowledge/DocumentUploader";
import { FAQEditor } from "@/components/knowledge/FAQEditor";
import { URLScraper } from "@/components/knowledge/URLScraper";
import { DocumentList } from "@/components/knowledge/DocumentList";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Upload, HelpCircle, Globe, Layers } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface Props {
  params: { id: string };
}

export default async function TrainingPage({ params }: Props) {
  const session = await getServerSession(authOptions);
  const userId = session!.user!.id as string;

  const chatbot = await prisma.chatbot.findFirst({
    where: { id: params.id, userId },
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
      <div className="flex items-center gap-4">
        <Link href={`/chatbot/${params.id}`}>
          <Button variant="ghost" size="sm" className="rounded-lg">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">
            Training — {chatbot.name}
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Upload documents, FAQs, or URLs to teach your chatbot
          </p>
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
