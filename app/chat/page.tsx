import { ChatInterface } from "@/components/ChatInterface";

export default function ChatPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Campus Q&A</h1>
        <p className="text-muted-foreground">
          Ask questions about notices, deadlines, or mess menus. Voice input is supported!
        </p>
      </div>
      <ChatInterface />
    </div>
  );
}
