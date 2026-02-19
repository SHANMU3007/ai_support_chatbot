import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { DocumentUploader } from "@/components/knowledge/DocumentUploader";
import { FAQEditor } from "@/components/knowledge/FAQEditor";
import { URLScraper } from "@/components/knowledge/URLScraper";
import { DocumentList } from "@/components/knowledge/DocumentList";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft } from "lucide-react";
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

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4">
        <Link href={`/chatbot/${params.id}`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Training - {chatbot.name}</h1>
          <p className="text-gray-500 text-sm mt-1">
            Upload documents, FAQs, or URLs to train your chatbot
          </p>
        </div>
      </div>

      <Tabs defaultValue="upload">
        <TabsList>
          <TabsTrigger value="upload">Upload Files</TabsTrigger>
          <TabsTrigger value="faq">FAQ Editor</TabsTrigger>
          <TabsTrigger value="url">Scrape URL</TabsTrigger>
          <TabsTrigger value="docs">
            Documents ({chatbot.documents.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="mt-4">
          <DocumentUploader chatbotId={params.id} />
        </TabsContent>

        <TabsContent value="faq" className="mt-4">
          <FAQEditor chatbotId={params.id} />
        </TabsContent>

        <TabsContent value="url" className="mt-4">
          <URLScraper chatbotId={params.id} />
        </TabsContent>

        <TabsContent value="docs" className="mt-4">
          <DocumentList documents={chatbot.documents} chatbotId={params.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
