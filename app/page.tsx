import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, Brain, Clock, ShieldCheck } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-full flex flex-col relative overflow-hidden bg-background">
      {/* Background decorations - Calendly Signature Gradient Blobs */}
      <div className="absolute top-10 right-0 w-[600px] h-[600px] bg-gradient-to-br from-[var(--color-magenta-bloom)] via-[var(--color-ultraviolet)] to-[var(--color-cyan-pop)] rounded-[100px] blur-[120px] opacity-20 -z-10 rotate-12" />
      <div className="absolute bottom-20 left-10 w-[500px] h-[500px] bg-gradient-to-tr from-[var(--color-amber-spark)] to-[var(--color-magenta-bloom)] rounded-[150px] blur-[100px] opacity-15 -z-10" />

      {/* Header */}
      <header className="px-6 py-6 flex items-center justify-between z-10 max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-primary" />
          <span className="text-xl font-bold tracking-tighter">CampusFlow</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Log In
          </Link>
          <Link href="/dashboard">
            <Button className="rounded-full shadow-sm font-medium">
              Get Started
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 pt-20 pb-32 text-center z-10 max-w-5xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-8">
          <Sparkles className="w-4 h-4" />
          <span>The Ultimate AI Student Assistant</span>
        </div>
        
        <h1 className="text-5xl md:text-[68px] font-bold tracking-tight mb-6 text-[var(--color-midnight-navy)] leading-[1.1]">
          Your Campus Life,<br />Managed by AI.
        </h1>
        
        <p className="text-lg md:text-[20px] text-[var(--color-slate-blue)] max-w-2xl mb-10 leading-[1.6]">
          Unify your class schedules, messy deadlines, and chaotic notices into one perfectly organized, beautifully intelligent platform.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4">
          <Link href="/dashboard">
            <Button size="lg" className="h-14 px-8 text-lg rounded-[4px] shadow-[var(--shadow-sm-3)] bg-[var(--color-signal-blue)] text-white hover:opacity-90 transition-opacity gap-2">
              Get started for free
            </Button>
          </Link>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-[32px] mt-24 text-left">
          <div className="p-6 rounded-[8px] bg-[var(--color-paper)] border border-[var(--color-mist-border)] shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-sm-2)] transition-shadow">
            <div className="w-12 h-12 rounded-[8px] bg-[var(--color-fog)] flex items-center justify-center mb-6">
              <Brain className="w-6 h-6 text-[var(--color-midnight-navy)]" />
            </div>
            <h3 className="text-xl font-bold mb-2">RAG AI Chatbot</h3>
            <p className="text-muted-foreground">Ask anything about your campus. We use vector embeddings to instantly fetch the exact notice or deadline you need.</p>
          </div>
          
          <div className="p-6 rounded-[8px] bg-[var(--color-paper)] border border-[var(--color-mist-border)] shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-sm-2)] transition-shadow">
            <div className="w-12 h-12 rounded-[8px] bg-[var(--color-fog)] flex items-center justify-center mb-6">
              <Clock className="w-6 h-6 text-[var(--color-midnight-navy)]" />
            </div>
            <h3 className="text-xl font-bold mb-2">AI Study Planner</h3>
            <p className="text-muted-foreground">Upload your timetable. Our AI will map your free time against your deadlines to craft the perfect weekly study schedule.</p>
          </div>
          
          <div className="p-6 rounded-[8px] bg-[var(--color-paper)] border border-[var(--color-mist-border)] shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-sm-2)] transition-shadow">
            <div className="w-12 h-12 rounded-[8px] bg-[var(--color-fog)] flex items-center justify-center mb-6">
              <ShieldCheck className="w-6 h-6 text-[var(--color-midnight-navy)]" />
            </div>
            <h3 className="text-xl font-bold mb-2">Deadline Brain</h3>
            <p className="text-muted-foreground">Stop missing assignments. Our chronological engine automatically prioritizes what's due tomorrow vs what's due next week.</p>
          </div>
        </div>
      </main>
      
      <footer className="py-8 text-center border-t border-border/40 text-muted-foreground text-sm z-10 mt-auto">
        Built for the Amazon AWS Track 48-Hour Hackathon.
      </footer>
    </div>
  );
}
