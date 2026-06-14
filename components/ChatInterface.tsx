"use client";

import { useState, useEffect, useRef } from "react";
import { v4 as uuidv4 } from "uuid";
import ReactMarkdown from "react-markdown";
import { Send, Mic, Volume2, VolumeX, Bot, User, Loader2, Trash2, Plus, Sun, Moon, ChevronLeft, ChevronRight, Copy, CheckCircle2, Sparkles, CalendarClock, Bell, Utensils, CalendarDays } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

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
            className="absolute inset-0 flex flex-col items-center justify-center rounded-[20px] border border-indigo-200 bg-[var(--color-canvas-white)] p-6 shadow-sm"
            style={{ backfaceVisibility: "hidden" }}
          >
            <span className="mb-2 text-xs font-medium uppercase tracking-wider text-indigo-400">Question</span>
            <p className="text-center text-base font-medium text-slate-800 leading-relaxed">{card.front}</p>
            <span className="mt-4 text-[11px] text-slate-400">Tap to reveal answer</span>
          </div>

          {/* Back Face */}
          <div
            className="absolute inset-0 flex flex-col items-center justify-center rounded-[20px] border border-emerald-200 bg-emerald-50 p-6 shadow-sm"
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
          className="flex items-center gap-1 rounded-[12px] border border-slate-200 bg-[var(--color-canvas-white)] px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm transition-colors hover:bg-slate-50 hover:border-slate-300"
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
          className="flex items-center gap-1 rounded-[12px] border border-slate-200 bg-[var(--color-canvas-white)] px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm transition-colors hover:bg-slate-50 hover:border-slate-300"
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
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
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

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
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
    if (textareaRef.current) textareaRef.current.style.height = "auto";
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
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    setIsLoading(true);

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

  const sourceBadges = [
    { keywords: ['budget', 'expense', 'spend', 'rupee', '₹'], label: '📊 PocketBuddy' },
    { keywords: ['dinner', 'lunch', 'breakfast', 'menu', 'meal'], label: '🍽️ Mess' },
    { keywords: ['cab', 'transport', 'pool', 'airport'], label: '🚕 Transport' },
    { keywords: ['placement', 'company', 'interview', 'package'], label: '🏢 Placement' },
    { keywords: ['mood', 'stress', 'wellness', 'burnout', 'sleep'], label: '❤️ Wellness' },
    { keywords: ['notice', 'circular', 'announcement'], label: '📋 Notices' },
    { keywords: ['deadline', 'assignment', 'exam', 'submit'], label: '📅 Deadlines' },
    { keywords: ['schedule', 'class', 'lecture', 'timetable'], label: '🗓️ Schedule' },
  ];

  const getSourceBadges = (text: string) => {
    return sourceBadges.filter(b =>
      b.keywords.some(k => text.toLowerCase().includes(k))
    );
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] max-w-5xl mx-auto w-full bg-[var(--chat-surface)] rounded-[20px] shadow-sm overflow-hidden border border-[var(--color-mist-border)] relative">
      
      {/* ─── 2. Premium Chat Header ────────────────────────────────────────── */}
      <div className="p-4 bg-white/80 backdrop-blur-sm border-b border-[var(--chat-surface-input)] flex justify-between items-center shadow-[0_2px_10px_rgba(0,0,0,0.02)] z-10 sticky top-0">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--chat-accent)] to-[#d44d24] flex items-center justify-center shadow-sm">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full"></div>
          </div>
          <div className="flex flex-col">
            <h2 className="text-[16px] font-semibold text-[var(--chat-text-primary)] leading-tight tracking-tight">CampusFlow Assistant</h2>
            <p className="text-[12px] text-[var(--chat-text-secondary)] mt-0.5 font-medium">
              {isAwaitingWellness
                ? "🩺 Wellness check-in active"
                : "Ask anything about your campus"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={startNewChat}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium text-[var(--chat-text-secondary)] bg-transparent border border-neutral-200 rounded-[12px] hover:bg-[var(--chat-accent-tint)] hover:text-[var(--chat-accent)] hover:border-[var(--chat-accent-tint)] transition-all duration-150"
          >
            <Plus className="w-3.5 h-3.5" /> <span className="hidden sm:inline">New Chat</span>
          </button>
          <button 
            onClick={clearChat}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium text-[var(--chat-text-secondary)] bg-transparent border border-neutral-200 rounded-[12px] hover:bg-red-50 hover:text-red-500 hover:border-red-100 transition-all duration-150"
          >
            <Trash2 className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Clear</span>
          </button>
          <button 
            onClick={() => setTtsEnabled(!ttsEnabled)}
            title={ttsEnabled ? "Mute responses" : "Unmute responses"}
            className="flex items-center justify-center w-8 h-8 text-[var(--chat-text-secondary)] bg-transparent border border-neutral-200 rounded-[12px] hover:bg-[var(--chat-accent-tint)] hover:text-[var(--chat-accent)] hover:border-[var(--chat-accent-tint)] transition-all duration-150"
          >
            {ttsEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <div className="flex-1 p-4 md:p-6 overflow-y-auto custom-scrollbar bg-[var(--chat-surface)]">
        
        {/* ─── 4. Empty / Welcome State ──────────────────────────────────────── */}
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center px-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[var(--chat-accent)] to-[#d44d24] flex items-center justify-center shadow-md mb-5">
              <Sparkles className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-[var(--chat-text-primary)] mb-2 tracking-tight">Hi, I'm your CampusFlow Assistant</h3>
            <p className="text-[15px] text-[var(--chat-text-secondary)] mb-10 max-w-sm">
              I can help you with your schedule, notices, mess menu, deadlines, and more.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-xl mb-8">
              {[
                { label: "Today's mess menu", icon: Utensils },
                { label: "Upcoming deadlines", icon: CalendarClock },
                { label: "Latest notices", icon: Bell },
                { label: "My class schedule", icon: CalendarDays }
              ].map((chip) => (
                <button
                  key={chip.label}
                  onClick={() => { setInput(chip.label); if(textareaRef.current) textareaRef.current.focus(); }}
                  className="flex items-center gap-3 p-3.5 text-left rounded-[12px] bg-[var(--chat-surface-alt)] border border-neutral-100 shadow-sm hover:shadow-md hover:-translate-y-[2px] hover:bg-[var(--chat-accent-tint)] hover:border-[var(--chat-accent-tint)] transition-all duration-200 group"
                >
                  <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center shadow-sm text-[var(--chat-accent)] group-hover:scale-110 transition-transform">
                    <chip.icon className="w-4 h-4" />
                  </div>
                  <span className="text-[14px] font-medium text-[var(--chat-text-primary)]">{chip.label}</span>
                </button>
              ))}
            </div>
            
            <div className="flex flex-wrap gap-2 max-w-2xl justify-center opacity-80 mt-4">
              <Button
                variant="outline"
                onClick={() => triggerBriefing("morning")}
                disabled={isLoading}
                className="rounded-[12px] h-9 text-[12px] border-amber-200 text-amber-700 hover:text-amber-800 hover:bg-amber-50 shadow-sm"
              >
                <Sun className="w-3.5 h-3.5 mr-2 text-amber-500" />
                Morning Briefing
              </Button>
              <Button
                variant="outline"
                onClick={() => triggerBriefing("evening")}
                disabled={isLoading}
                className="rounded-[12px] h-9 text-[12px] border-indigo-200 text-indigo-700 hover:text-indigo-800 hover:bg-indigo-50 shadow-sm"
              >
                <Moon className="w-3.5 h-3.5 mr-2 text-indigo-500" />
                Evening Wrap-up
              </Button>
            </div>
          </div>
        )}
        
        {/* ─── 3. Message Bubbles ────────────────────────────────────────────── */}
        <div className="space-y-1 pb-4">
          {messages.map((msg, index) => {
            const isUser = msg.role === "user";
            const prevMsg = index > 0 ? messages[index - 1] : null;
            const isConsecutive = prevMsg && prevMsg.role === msg.role;
            const nextMsg = index < messages.length - 1 ? messages[index + 1] : null;
            const isLastConsecutive = !nextMsg || nextMsg.role !== msg.role;
            
            return (
              <div 
                key={msg.id} 
                className={`group flex flex-col ${isUser ? "items-end" : "items-start"} animate-in slide-in-from-bottom-2 fade-in duration-300 ${!isConsecutive ? "mt-6" : ""}`}
              >
                <div className={`flex gap-3 max-w-[85%] sm:max-w-[75%] ${isUser ? "flex-row-reverse" : "flex-row"} relative`}>
                  
                  {/* Assistant Avatar */}
                  {!isUser && (
                    <div className={`w-8 h-8 rounded-full bg-gradient-to-br from-[var(--chat-accent)] to-[#d44d24] shrink-0 flex items-center justify-center shadow-sm mt-1 ${isConsecutive ? "invisible" : "visible"}`}>
                      <Sparkles className="w-4 h-4 text-white" />
                    </div>
                  )}
                  
                  <div className="flex flex-col relative group/bubble">
                    <div className={`px-4 py-3 shadow-sm text-[15px] leading-relaxed relative ${
                      isUser 
                        ? `bg-gradient-to-br from-[var(--chat-accent)] to-[#d44d24] text-white rounded-[16px] ${isLastConsecutive ? 'rounded-br-[4px]' : ''}`
                        : `bg-[var(--chat-surface-alt)] text-[var(--chat-text-primary)] rounded-[16px] border border-neutral-100/50 ${isLastConsecutive ? 'rounded-bl-[4px]' : ''}`
                    }`}>
                      {msg.role === "assistant" && msg.content === "" ? (
                        <div className="flex items-center gap-1.5 h-6 px-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-[var(--chat-accent)] animate-bounce" style={{ animationDelay: "0ms" }}></div>
                          <div className="w-1.5 h-1.5 rounded-full bg-[var(--chat-accent)] animate-bounce" style={{ animationDelay: "150ms" }}></div>
                          <div className="w-1.5 h-1.5 rounded-full bg-[var(--chat-accent)] animate-bounce" style={{ animationDelay: "300ms" }}></div>
                        </div>
                      ) : (
                        <div className="whitespace-pre-wrap">
                          <ReactMarkdown
                            components={{
                              p: ({node, ...props}: any) => <p className="mb-2 last:mb-0" {...props} />,
                              ul: ({node, ...props}: any) => <ul className="list-disc ml-4 mb-2 marker:text-[var(--chat-accent-muted)]" {...props} />,
                              ol: ({node, ...props}: any) => <ol className="list-decimal ml-4 mb-2 marker:text-[var(--chat-accent-muted)] font-medium" {...props} />,
                              li: ({node, ...props}: any) => <li className="mb-1" {...props} />,
                              strong: ({node, ...props}: any) => <strong className="font-semibold" {...props} />
                            }}
                          >
                            {msg.content}
                          </ReactMarkdown>

                          {/* Source Attribution Badges */}
                          {msg.role === "assistant" && msg.content && (() => {
                            const detected = getSourceBadges(msg.content);
                            if (detected.length === 0) return null;
                            return (
                              <div className="flex gap-2 mt-3 flex-wrap">
                                {detected.map(b => (
                                  <span key={b.label} className="text-[11px] font-medium text-[var(--chat-text-secondary)] bg-white/60 border border-[var(--chat-surface-input)] rounded-[12px] px-2.5 py-0.5">
                                    {b.label}
                                  </span>
                                ))}
                              </div>
                            );
                          })()}

                          {msg.videoPayload && (
                            <div className="bg-neutral-900 border border-purple-500/50 rounded-[16px] p-3 mt-3 shadow-sm w-full min-w-[300px] sm:min-w-[400px]">
                              <div className="flex items-center gap-2 mb-2 border-b border-purple-500/30 pb-2">
                                <span className="text-lg">🎥</span>
                                <h4 className="text-xs font-medium text-purple-200">
                                  AI Timestamp Found: {Math.floor(msg.videoPayload.timestamp / 60)}:{(msg.videoPayload.timestamp % 60).toString().padStart(2, '0')}
                                </h4>
                              </div>
                              <div className="relative w-full pt-[56.25%] rounded-[8px] overflow-hidden border border-neutral-800 bg-black">
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
                    
                    {/* Hover Actions & Timestamp */}
                    <div className={`flex items-center gap-2 mt-1 opacity-0 group-hover/bubble:opacity-100 transition-opacity duration-200 ${isUser ? "justify-end" : "justify-start"} px-1`}>
                      {!isUser && msg.content && (
                        <button 
                          onClick={() => copyToClipboard(msg.content, msg.id)}
                          className="flex items-center gap-1 text-[11px] font-medium text-[var(--chat-text-secondary)] hover:text-[var(--chat-accent)] transition-colors rounded-[4px] py-0.5 px-1 hover:bg-[var(--chat-accent-tint)]"
                        >
                          {copiedId === msg.id ? <CheckCircle2 className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedId === msg.id ? "Copied" : "Copy"}</span>
                        </button>
                      )}
                      <span className="text-[10px] text-neutral-300 pointer-events-none select-none">Just now</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={scrollRef} className="h-6" />
        </div>
      </div>

      {/* ─── 5. Redesigned Input Composer ────────────────────────────────────── */}
      <div className="p-4 bg-[var(--chat-surface)] relative z-10">
        {/* Wellness indicator floating above */}
        {isAwaitingWellness && (
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold shadow-sm flex items-center gap-2 animate-in slide-in-from-bottom-2 fade-in">
            <span className="animate-pulse">💙</span>
            Wellness check-in active
          </div>
        )}

        <form 
          onSubmit={sendMessage} 
          className="flex gap-2 items-end bg-[var(--chat-surface-input)] border border-transparent rounded-[24px] p-2 focus-within:ring-2 focus-within:ring-[var(--chat-accent)]/20 focus-within:border-[var(--chat-accent)] focus-within:bg-white transition-all duration-200 mx-auto max-w-4xl shadow-sm hover:shadow-md"
        >
          <button 
            type="button" 
            onClick={handleVoice}
            className={`shrink-0 flex items-center justify-center h-[42px] w-[42px] rounded-full transition-all duration-200 relative mb-0.5 ml-0.5 ${
              isListening 
                ? "bg-[var(--chat-accent-tint)] text-[var(--chat-accent)]" 
                : "bg-transparent text-[var(--chat-text-secondary)] hover:bg-black/5 hover:text-black"
            }`}
            title="Voice Input"
          >
            {isListening && (
              <span className="absolute inset-0 rounded-full border-2 border-[var(--chat-accent)] animate-ping opacity-50"></span>
            )}
            <Mic className="w-5 h-5" />
          </button>
          
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInput}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage(e as unknown as React.FormEvent);
              }
            }}
            placeholder={isAwaitingWellness ? "How are you feeling today?" : "Message CampusFlow Assistant..."}
            disabled={isLoading || isListening}
            className="flex-1 max-h-[160px] min-h-[44px] py-3 px-2 text-[15px] bg-transparent resize-none outline-none text-[var(--chat-text-primary)] placeholder:text-[var(--chat-text-secondary)] leading-relaxed custom-scrollbar disabled:opacity-50"
            rows={1}
          />
          
          <button 
            type="submit" 
            disabled={!input.trim() || isLoading || isListening}
            className={`shrink-0 flex items-center justify-center h-[42px] w-[42px] rounded-full transition-all duration-200 mb-0.5 mr-0.5 ${
              input.trim() && !isLoading && !isListening
                ? "bg-[var(--chat-accent)] text-white shadow-sm hover:shadow-md hover:scale-[1.03] active:scale-95"
                : "bg-neutral-200 text-white/80 cursor-not-allowed"
            }`}
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 ml-0.5" />}
          </button>
        </form>
        <div className="text-center mt-3">
          <span className="text-[11px] text-[var(--chat-text-secondary)] tracking-wide">CampusFlow AI can make mistakes. Always verify important details.</span>
        </div>
      </div>
    </div>
  );
}
