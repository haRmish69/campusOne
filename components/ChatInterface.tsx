"use client";

import { useState, useEffect, useRef } from "react";
import { v4 as uuidv4 } from "uuid";
import ReactMarkdown from "react-markdown";
import { Send, Mic, Volume2, VolumeX, Bot, User, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [sessionId, setSessionId] = useState("");
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

  const sendMessage = async (e?: React.FormEvent, overrideInput?: string) => {
    if (e) e.preventDefault();
    const textToSend = overrideInput || input;
    if (!textToSend.trim() || isLoading) return;

    const userMessage: Message = { id: uuidv4(), role: "user", content: textToSend };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    const history = messages.slice(-5).map(m => ({ role: m.role, content: m.content }));
    const assistantMessageId = uuidv4();
    
    setMessages(prev => [...prev, { id: assistantMessageId, role: "assistant", content: "" }]);

    try {
      const res = await fetch("/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: textToSend,
          history,
          sessionId
        })
      });

      if (!res.ok) throw new Error("Failed to fetch response");
      if (!res.body) throw new Error("No body returned");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullResponse = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        fullResponse += chunk;
        
        setMessages(prev => 
          prev.map(m => 
            m.id === assistantMessageId 
              ? { ...m, content: fullResponse }
              : m
          )
        );
      }
      
      speak(fullResponse);
      
    } catch (error) {
      console.error(error);
      toast.error("An error occurred while fetching the response.");
      setMessages(prev => prev.filter(m => m.id !== assistantMessageId));
    } finally {
      setIsLoading(false);
    }
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
          <p className="text-xs text-muted-foreground">Ask anything about your campus</p>
        </div>
        <Button 
          variant="outline" 
          size="icon"
          onClick={() => setTtsEnabled(!ttsEnabled)}
          title={ttsEnabled ? "Disable Voice" : "Enable Voice"}
        >
          {ttsEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-muted-foreground" />}
        </Button>
      </div>

      <ScrollArea className="flex-1 p-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground mt-20">
            <Bot className="w-12 h-12 mb-4 opacity-20" />
            <p className="mb-8">I'm ready to answer your questions.</p>
            <div className="flex flex-col gap-2">
              {quickQuestions.map(q => (
                <Button 
                  key={q} 
                  variant="outline" 
                  size="sm" 
                  onClick={() => sendMessage(undefined, q)}
                  className="rounded-full px-4 text-xs h-8"
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
                  </div>
                )}
              </div>
            </div>
          ))}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      <div className="p-4 bg-card border-t">
        <form onSubmit={sendMessage} className="flex gap-2">
          <Button 
            type="button" 
            variant={isListening ? "destructive" : "outline"}
            size="icon"
            onClick={handleVoice}
            className={`shrink-0 ${isListening ? "animate-pulse" : ""}`}
            title="Voice Input"
          >
            <Mic className="w-4 h-4" />
          </Button>
          <Input 
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Ask a question..."
            disabled={isLoading || isListening}
            className="flex-1"
          />
          <Button type="submit" disabled={!input.trim() || isLoading || isListening}>
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </form>
      </div>
    </div>
  );
}
