import { ChatInterface } from "@/components/ChatInterface";

export default function ChatPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight mb-2">AI Campus Brain</h1>
        <p className="text-muted-foreground">
          College document understanding, smart notice extraction, academic calendars, timetables, and contextual answers.
        </p>
      </div>
      <ChatInterface />
    </div>
  );
}
