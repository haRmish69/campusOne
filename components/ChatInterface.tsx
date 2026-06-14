"use client";

import { useState, useEffect, useRef } from "react";
import { v4 as uuidv4 } from "uuid";
import ReactMarkdown from "react-markdown";
import { Send, Mic, Volume2, VolumeX, Bot, User, Loader2, Trash2, Plus, Sun, Moon, ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  videoPayload?: {
    videoId: string;
    timestamp: number;
    url: string;
  };
  flashcardPayload?: {
    topic: string;
    cards: { front: string; back: string }[];
  };
}

// ─── FlashcardDeck Sub-Component ─────────────────────────────────────────
function FlashcardDeck({ payload }: { payload: { topic: string; cards: { front: string; back: string }[] } }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  const total = payload.cards.length;
  const card = payload.cards[currentIndex];

  const goNext = () => {
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev + 1) % total);
  };

  const goPrev = () => {
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev - 1 + total) % total);
  };

  return (
    <div className="mt-4 w-full max-w-[480px]">
      {/* Topic Header */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">🧠</span>
        <h4 className="text-sm font-semibold text-slate-700">{payload.topic}</h4>
        <span className="ml-auto text-xs font-medium text-slate-400">
          {currentIndex + 1} of {total}
        </span>
      </div>

      {/* 3D Flip Card */}
      <div
        className="cursor-pointer"
        style={{ perspective: "1000px" }}
        onClick={() => setIsFlipped(!isFlipped)}
      >
        <div
          className="relative w-full transition-transform duration-500"
          style={{
            transformStyle: "preserve-3d",
            transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
            minHeight: "200px",
          }}
        >
          {/* Front Face */}
          <div
            className="absolute inset-0 flex flex-col items-center justify-center rounded-xl border border-indigo-200 bg-white p-6 shadow-sm"
            style={{ backfaceVisibility: "hidden" }}
          >
            <span className="mb-2 text-xs font-medium uppercase tracking-wider text-indigo-400">Question</span>
            <p className="text-center text-base font-medium text-slate-800 leading-relaxed">{card.front}</p>
            <span className="mt-4 text-[11px] text-slate-400">Tap to reveal answer</span>
          </div>

          {/* Back Face */}
          <div
            className="absolute inset-0 flex flex-col items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 p-6 shadow-sm"
            style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
          >
            <span className="mb-2 text-xs font-medium uppercase tracking-wider text-emerald-500">Answer</span>
            <p className="text-center text-sm text-slate-700 leading-relaxed">{card.back}</p>
            <span className="mt-4 text-[11px] text-slate-400">Tap to see question</span>
          </div>
        </div>
      </div>

      {/* Navigation Controls */}
      <div className="mt-3 flex items-center justify-between">
        <button
          onClick={(e) => { e.stopPropagation(); goPrev(); }}
          className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm transition-colors hover:bg-slate-50 hover:border-slate-300"
        >
          <ChevronLeft className="h-3.5 w-3.5" /> Prev
        </button>

        {/* Progress Dots */}
        <div className="flex gap-1">
          {payload.cards.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === currentIndex ? "w-4 bg-indigo-500" : "w-1.5 bg-slate-200"
              }`}
            />
          ))}
        </div>

        <button
          onClick={(e) => { e.stopPropagation(); goNext(); }}
          className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm transition-colors hover:bg-slate-50 hover:border-slate-300"
        >
          Next <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [sessionId, setSessionId] = useState("");
  const [isAwaitingWellness, setIsAwaitingWellness] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    // Check local storage for session
    let sid = localStorage.getItem("campusflow_session");
    if (!sid) {
      sid = uuidv4();
      localStorage.setItem("campusflow_session", sid);
    }
    setSessionId(sid);

    // Fetch history
    fetch(`/api/chat?sessionId=${sid}`)
      .then(r => r.json())
      .then(data => {
        if (data.messages) setMessages(data.messages);
      })
      .catch(e => console.error("Failed to load history", e));
  }, []);

  useEffect(() => {
    // Scroll to bottom
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const speak = (text: string) => {
    if (!ttsEnabled || !window.speechSynthesis) return;
    const synth = window.speechSynthesis;
    synth.cancel(); // cancel current
    const utterance = new SpeechSynthesisUtterance(text);
    synth.speak(utterance);
  };

  const handleVoice = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("Your browser doesn't support voice input.");
      return;
    }
    
    if (isListening) return; // Wait to finish if already listening
    
    setIsListening(true);
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
      setIsListening(false);
    };
    
    recognition.onerror = () => {
      setIsListening(false);
      toast.error("Voice input failed. Please try again.");
    };
    
    recognition.onend = () => {
      setIsListening(false);
    };
    
    recognition.start();
  };

  // ─── Proactive Routine Engine: Briefing Trigger ────────────────────────
  const triggerBriefing = async (type: "morning" | "evening") => {
    if (isLoading) return;
    setIsLoading(true);

    const assistantMessageId = uuidv4();
    setMessages(prev => [...prev, { id: assistantMessageId, role: "assistant", content: "" }]);

    try {
      const res = await fetch("/api/briefing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, sessionId }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: `Server returned ${res.status}` }));
        throw new Error(errorData.error || `Server error: ${res.status}`);
      }

      const data = await res.json();
      const briefingText = data.briefing;

      setMessages(prev =>
        prev.map(m =>
          m.id === assistantMessageId
            ? { ...m, content: briefingText }
            : m
        )
      );

      // Activate wellness check-in mode
      setIsAwaitingWellness(true);
      speak(briefingText);

    } catch (error: any) {
      console.error("Briefing Error:", error);
      toast.error("Briefing Error", {
        description: error.message,
        style: { backgroundColor: '#ef4444', color: 'white', border: '1px solid #dc2626' },
        className: "!text-white",
        descriptionClassName: "!text-white !opacity-100 font-bold"
      });
      setMessages(prev => prev.filter(m => m.id !== assistantMessageId));
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Wellness Sync Handler ─────────────────────────────────────────────
  const handleWellnessSync = async (userText: string) => {
    const userMessage: Message = { id: uuidv4(), role: "user", content: userText };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    const assistantMessageId = uuidv4();
    setMessages(prev => [...prev, { id: assistantMessageId, role: "assistant", content: "" }]);

    try {
      const res = await fetch("/api/wellness-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: userText, sessionId }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: `Server returned ${res.status}` }));
        throw new Error(errorData.error || `Server error: ${res.status}`);
      }

      const data = await res.json();
      const responseText = data.response;
      const logged = data.logged;

      // Show the empathetic response + a summary of what was logged
      const fullResponse = `${responseText}\n\n📊 *Logged:* Mood ${logged.mood}/10 · Stress ${logged.stressLevel}/10 · Sleep ${logged.sleepHours}h`;

      setMessages(prev =>
        prev.map(m =>
          m.id === assistantMessageId
            ? { ...m, content: fullResponse }
            : m
        )
      );

      // Deactivate wellness mode
      setIsAwaitingWellness(false);
      speak(responseText);
      toast.success("Wellness check-in logged! 💙");

    } catch (error: any) {
      console.error("Wellness Sync Error:", error);
      toast.error("Wellness Sync Error", {
        description: error.message,
        style: { backgroundColor: '#ef4444', color: 'white', border: '1px solid #dc2626' },
        className: "!text-white",
        descriptionClassName: "!text-white !opacity-100 font-bold"
      });
      setMessages(prev => prev.filter(m => m.id !== assistantMessageId));
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Main Send Handler ────────────────────────────────────────────────
  const sendMessage = async (e?: React.FormEvent, overrideInput?: string) => {
    if (e) e.preventDefault();
    const textToSend = overrideInput || input;
    if (!textToSend.trim() || isLoading) return;

    // Route to wellness sync if we're awaiting a wellness response
    if (isAwaitingWellness) {
      return handleWellnessSync(textToSend);
    }

    const userMessage: Message = { id: uuidv4(), role: "user", content: textToSend };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    const history = messages.slice(-5).map(m => ({ role: m.role, content: m.content }));
    const assistantMessageId = uuidv4();
    
    setMessages(prev => [...prev, { id: assistantMessageId, role: "assistant", content: "" }]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: textToSend,
          sessionId
        })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: `Server returned ${res.status}` }));
        throw new Error(errorData.error || `Server error: ${res.status}`);
      }

      const data = await res.json();
      
      setMessages(prev => 
        prev.map(m => 
          m.id === assistantMessageId 
            ? { ...m, content: data.text, videoPayload: data.videoPayload, flashcardPayload: data.flashcardPayload }
            : m
        )
      );
      
      speak(data.text);
      
    } catch (error: any) {
      let errorMsg = error.message || "An unexpected error occurred.";
      try {
        const parsed = JSON.parse(errorMsg);
        if (parsed.error && parsed.error.message) errorMsg = parsed.error.message;
      } catch (e) {}
      
      console.error("Chat Error:", errorMsg);
      try {
        const parsed = JSON.parse(errorMsg);
        if (parsed.error && parsed.error.message) errorMsg = parsed.error.message;
      } catch (e) {}
      
      toast.error("Chat Error", {
        description: errorMsg,
        style: {
          backgroundColor: '#ef4444', 
          color: 'white', 
          border: '1px solid #dc2626'
        },
        className: "!text-white", 
        descriptionClassName: "!text-white !opacity-100 font-bold"
      });
      setMessages(prev => prev.filter(m => m.id !== assistantMessageId));
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = async () => {
    setMessages([]);
    setIsAwaitingWellness(false);
    try {
      await fetch(`/api/chat?sessionId=${sessionId}`, { method: "DELETE" });
      toast.success("Chat history cleared");
    } catch (error) {
      console.error("Failed to clear chat", error);
    }
  };

  const startNewChat = () => {
    const newSid = uuidv4();
    localStorage.setItem("campusflow_session", newSid);
    setSessionId(newSid);
    setMessages([]);
    setIsAwaitingWellness(false);
    toast.success("Started a new chat session");
  };

  const quickQuestions = [
    "What's for dinner today?",
    "Any upcoming exams?",
    "What is the venue for the last placement notice?"
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] max-w-4xl mx-auto w-full border rounded-xl overflow-hidden bg-card/50 shadow-sm">
      <div className="p-4 border-b bg-card flex justify-between items-center">
        <div>
          <h2 className="font-semibold tracking-tight">CampusFlow Assistant</h2>
          <p className="text-xs text-muted-foreground">
            {isAwaitingWellness
              ? "🩺 Wellness check-in active — tell me how you're feeling!"
              : "Ask anything about your campus"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={startNewChat}
            className="text-muted-foreground"
          >
            <Plus className="w-4 h-4 mr-2" /> New Chat
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={clearChat}
            className="text-muted-foreground"
          >
            <Trash2 className="w-4 h-4 mr-2" /> Clear Chat
          </Button>
          <Button 
            variant="outline" 
            size="icon"
            onClick={() => setTtsEnabled(!ttsEnabled)}
            title={ttsEnabled ? "Disable Voice" : "Enable Voice"}
          >
            {ttsEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-muted-foreground" />}
          </Button>
        </div>
      </div>

      <div className="flex-1 p-4 overflow-y-auto">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground mt-10">
            <Bot className="w-12 h-12 mb-4 opacity-20" />
            <p className="mb-6">I'm ready to answer your questions.</p>

            {/* ─── Briefing Buttons ─────────────────────────────────────── */}
            <div className="flex gap-3 mb-8">
              <Button
                variant="outline"
                onClick={() => triggerBriefing("morning")}
                disabled={isLoading}
                className="rounded-[8px] px-6 py-5 h-auto text-[15px] border-amber-300/50 text-amber-700 hover:text-amber-800 hover:bg-amber-50 hover:border-amber-400 transition-all shadow-sm hover:shadow-md"
              >
                <Sun className="w-5 h-5 mr-2 text-amber-500" />
                🌅 Morning Briefing
              </Button>
              <Button
                variant="outline"
                onClick={() => triggerBriefing("evening")}
                disabled={isLoading}
                className="rounded-[8px] px-6 py-5 h-auto text-[15px] border-indigo-300/50 text-indigo-700 hover:text-indigo-800 hover:bg-indigo-50 hover:border-indigo-400 transition-all shadow-sm hover:shadow-md"
              >
                <Moon className="w-5 h-5 mr-2 text-indigo-500" />
                🌙 Evening Wrap-up
              </Button>
            </div>

            {/* ─── Quick Questions ──────────────────────────────────────── */}
            <div className="flex flex-col gap-2">
              {quickQuestions.map(q => (
                <Button 
                  key={q} 
                  variant="outline" 
                  size="sm" 
                  onClick={() => sendMessage(undefined, q)}
                  className="rounded-[4px] px-6 py-4 h-auto text-[15px] border-[var(--color-mist-border)] text-[var(--color-slate-blue)] hover:text-[var(--color-midnight-navy)] hover:bg-[var(--color-fog)] hover:border-[var(--color-midnight-navy)] transition-colors shadow-sm"
                >
                  {q}
                </Button>
              ))}
            </div>
          </div>
        )}
        
        <div className="space-y-6 pb-4">
          {messages.map((msg) => (
            <div 
              key={msg.id} 
              className={`flex gap-3 max-w-[85%] ${msg.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"}`}
            >
              <div className={`flex items-center justify-center w-8 h-8 rounded-full shrink-0 ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                {msg.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>
              <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${msg.role === "user" ? "bg-primary text-primary-foreground rounded-tr-sm" : "bg-muted rounded-tl-sm"}`}>
                {msg.role === "assistant" && msg.content === "" ? (
                  <Loader2 className="w-4 h-4 animate-spin opacity-50" />
                ) : (
                  <div className="whitespace-pre-wrap">
                    <ReactMarkdown
                      components={{
                        p: ({node, ...props}: any) => <p className="mb-2 last:mb-0" {...props} />,
                        ul: ({node, ...props}: any) => <ul className="list-disc ml-4 mb-2" {...props} />,
                        ol: ({node, ...props}: any) => <ol className="list-decimal ml-4 mb-2" {...props} />,
                        li: ({node, ...props}: any) => <li className="mb-1" {...props} />
                      }}
                    >
                      {msg.content}
                    </ReactMarkdown>

                    {msg.videoPayload && (
                      <div className="bg-neutral-900 border border-purple-500/50 rounded-xl p-4 mt-3 shadow-lg shadow-purple-900/20 w-full min-w-[300px] sm:min-w-[400px]">
                        <div className="flex items-center gap-2 mb-3 border-b border-purple-500/30 pb-2">
                          <span className="text-xl">🎥</span>
                          <h4 className="text-sm font-semibold text-purple-200">
                            AI Timestamp Found: {Math.floor(msg.videoPayload.timestamp / 60)}:{(msg.videoPayload.timestamp % 60).toString().padStart(2, '0')}
                          </h4>
                        </div>
                        <div className="relative w-full pt-[56.25%] rounded-lg overflow-hidden border border-neutral-800">
                          <iframe
                            className="absolute top-0 left-0 w-full h-full"
                            src={msg.videoPayload.url}
                            allow="autoplay; encrypted-media; fullscreen"
                            title="YouTube Lecture"
                          />
                        </div>
                      </div>
                    )}

                    {msg.flashcardPayload && (
                      <FlashcardDeck payload={msg.flashcardPayload} />
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
          <div ref={scrollRef} />
        </div>
      </div>

      <div className="p-6 bg-[var(--color-paper)] border-t border-[var(--color-mist-border)]">
        {/* Wellness mode indicator */}
        {isAwaitingWellness && (
          <div className="mb-3 px-4 py-2 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 text-sm flex items-center gap-2">
            <span className="animate-pulse">💙</span>
            <span>Wellness check-in active — share how you're feeling and I'll log it for you.</span>
          </div>
        )}
        <form onSubmit={sendMessage} className="flex gap-3">
          <Button 
            type="button" 
            variant={isListening ? "destructive" : "outline"}
            size="icon"
            onClick={handleVoice}
            className={`shrink-0 h-[60px] w-[60px] rounded-[4px] border-[var(--color-mist-border)] ${isListening ? "animate-pulse" : ""}`}
            title="Voice Input"
          >
            <Mic className="w-5 h-5" />
          </Button>
          <Input 
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={isAwaitingWellness ? "Tell me about your sleep, mood, and stress..." : "Ask a question about your campus..."}
            disabled={isLoading || isListening}
            className="flex-1 h-[60px] px-6 text-[16px] rounded-[4px] border-[var(--color-mist-border)] shadow-[var(--shadow-sm)] focus-visible:ring-[var(--color-signal-blue)]"
          />
          <Button 
            type="submit" 
            disabled={!input.trim() || isLoading || isListening}
            className="h-[60px] px-8 rounded-[4px] bg-[var(--color-signal-blue)] hover:opacity-90 text-white shadow-[var(--shadow-sm-3)]"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </Button>
        </form>
      </div>
    </div>
  );
}
