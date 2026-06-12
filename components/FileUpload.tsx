"use client";

import { useState, useRef } from "react";
import { UploadCloud, FileText, Loader2, Image as ImageIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export function FileUpload({ apiEndpoint = "/api/ingest", onSuccess }: { apiEndpoint?: string; onSuccess?: () => void }) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string>("");
  const [textInput, setTextInput] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const processFile = async (file: File) => {
    if (!file.type.startsWith("image/") && file.type !== "application/pdf") {
      toast.error("Unsupported file type", {
        description: "Please upload an image (JPG, PNG) or PDF file.",
      });
      return;
    }

    toast.info(`File selected: ${file.name}`, {
      description: `Size: ${(file.size / 1024).toFixed(1)} KB. Starting upload...`,
    });

    setIsUploading(true);
    setUploadStatus("Reading file...");
    
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = e.target?.result as string;
        setUploadStatus("Sending to AI for processing...");
        await submitNotice("image", base64);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error(error);
      toast.error("Failed to read file", {
        description: "The file may be corrupted. Please try another file.",
      });
      setIsUploading(false);
      setUploadStatus("");
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleTextSubmit = async () => {
    if (!textInput.trim()) {
      toast.error("Empty text", {
        description: "Please paste or type some text before submitting.",
      });
      return;
    }
    toast.info("Processing text...", { description: "Sending to AI for extraction." });
    setIsUploading(true);
    setUploadStatus("Sending to AI for processing...");
    await submitNotice("text", textInput);
  };

  const submitNotice = async (type: "image" | "text", data: string) => {
    const toastId = toast.loading("AI is extracting data...", {
      description: "This may take a few seconds. Please wait.",
    });

    try {
      setUploadStatus("AI is analyzing your content...");

      const res = await fetch(apiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, data }),
      });

      const json = await res.json();
      
      if (!res.ok) {
        throw new Error(json.error || "Failed to process");
      }

      const itemCount = json.count || 1;
      toast.success(`Successfully saved ${itemCount} item${itemCount > 1 ? "s" : ""}!`, {
        id: toastId,
        description: "Your data has been extracted and stored.",
      });
      setTextInput("");
      router.refresh();
      onSuccess?.();
    } catch (error: any) {
      console.error(error);
      toast.error("Upload failed", {
        id: toastId,
        description: error.message || "An unexpected error occurred. Please try again.",
      });
    } finally {
      setIsUploading(false);
      setUploadStatus("");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleWhatsAppUpload = async (file: File) => {
    if (!file.name.endsWith(".txt")) {
      toast.error("Unsupported file type", { description: "Please upload a .txt file exported from WhatsApp." });
      return;
    }

    toast.info("Reading WhatsApp Export...");
    setIsUploading(true);
    setUploadStatus("Reading file...");

    try {
      const text = await file.text();
      setUploadStatus("Analyzing chat logs in batches...");
      const toastId = toast.loading("Processing WhatsApp Chat...", { description: "Extracting genuine notices..." });

      const res = await fetch("/api/whatsapp/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileContent: text })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Import failed");

      toast.success(`Import Complete!`, {
        id: toastId,
        description: `Scanned ${data.totalMessages} messages. Imported ${data.noticesImported} notices.`,
        duration: 5000
      });
      router.refresh();
      onSuccess?.();
    } catch (error: any) {
      console.error(error);
      toast.error("WhatsApp Import Failed", { description: error.message || "An unexpected error occurred." });
    } finally {
      setIsUploading(false);
      setUploadStatus("");
    }
  };

  return (
    <Card className="w-full shadow-sm">
      <CardContent className="pt-6">
        <Tabs defaultValue="upload" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="upload" disabled={isUploading}>
              <ImageIcon className="w-4 h-4 mr-2" /> Upload Image/PDF
            </TabsTrigger>
            <TabsTrigger value="text" disabled={isUploading}>
              <FileText className="w-4 h-4 mr-2" /> Paste Text
            </TabsTrigger>
            <TabsTrigger value="whatsapp" disabled={isUploading}>
              <MessageCircle className="w-4 h-4 mr-2" /> WhatsApp Import
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="upload">
            <div 
              className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors cursor-pointer flex flex-col items-center justify-center min-h-[250px]
                ${isDragging ? "border-primary bg-primary/5" : "border-border/50 bg-muted/20 hover:bg-muted/50"}
                ${isUploading ? "opacity-50 pointer-events-none" : ""}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*,application/pdf"
                onChange={handleFileSelect}
              />
              {isUploading ? (
                <>
                  <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
                  <h3 className="text-lg font-medium">Processing with AI...</h3>
                  <p className="text-sm text-muted-foreground mt-2">{uploadStatus || "Extracting details from your file"}</p>
                </>
              ) : (
                <>
                  <UploadCloud className="w-10 h-10 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">Drag & drop your notice</h3>
                  <p className="text-sm text-muted-foreground mt-2 mb-6">or click to browse files (Image/PDF)</p>
                  <Button variant="outline" size="sm" type="button" className="pointer-events-none">Select File</Button>
                </>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="text">
            <div className="flex flex-col space-y-4">
              <textarea 
                className="flex min-h-[250px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 resize-y"
                placeholder="Paste the raw text of the notice here..."
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                disabled={isUploading}
              />
              <Button 
                onClick={handleTextSubmit} 
                disabled={isUploading || !textInput.trim()}
                className="w-full sm:w-auto self-end"
              >
                {isUploading ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...</>
                ) : (
                  "Extract Notice"
                )}
              </Button>
            </div>
          </TabsContent>
          
          <TabsContent value="whatsapp">
            <div 
              className={`border-2 border-dashed border-green-500/30 bg-green-500/5 rounded-lg p-12 text-center transition-colors cursor-pointer flex flex-col items-center justify-center min-h-[250px]
                ${isDragging ? "border-green-500 bg-green-500/10" : "hover:bg-green-500/10"}
                ${isUploading ? "opacity-50 pointer-events-none" : ""}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={async (e) => {
                e.preventDefault();
                setIsDragging(false);
                const file = e.dataTransfer.files[0];
                if (file) handleWhatsAppUpload(file);
              }}
              onClick={() => {
                const input = document.createElement("input");
                input.type = "file";
                input.accept = ".txt";
                input.onchange = (e: any) => {
                  const file = e.target.files?.[0];
                  if (file) handleWhatsAppUpload(file);
                };
                input.click();
              }}
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-10 h-10 text-green-500 animate-spin mb-4" />
                  <h3 className="text-lg font-medium text-green-700">Scanning Chat Export...</h3>
                  <p className="text-sm text-green-600/80 mt-2">{uploadStatus || "This may take a minute for large chats."}</p>
                </>
              ) : (
                <>
                  <MessageCircle className="w-10 h-10 text-green-500 mb-4" />
                  <h3 className="text-lg font-medium text-green-700">Import WhatsApp Export</h3>
                  <p className="text-sm text-green-600/80 mt-2 max-w-[280px] mx-auto mb-6">
                    Open WhatsApp → Chat → Export Chat → Without Media → upload the .txt file here.
                  </p>
                  <Button variant="outline" size="sm" type="button" className="pointer-events-none border-green-500/30 text-green-600">Select .txt File</Button>
                </>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
