"use client";

import { useState, useRef } from "react";
import { CloudUpload, ClipboardList, Loader2, Image as ImageIcon } from "lucide-react";
import { MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import "@/app/notices/notices.css";

export function FileUpload({ apiEndpoint = "/api/ingest", onSuccess }: { apiEndpoint?: string; onSuccess?: () => void }) {
  const [activeTab, setActiveTab] = useState<"image" | "text" | "whatsapp">("image");
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
        const errorMsg = typeof json.error === "string" ? json.error : JSON.stringify(json.error);
        if (res.status === 429 || errorMsg?.includes("429") || errorMsg?.includes("quota") || errorMsg?.includes("Quota")) {
          throw new Error("AI is currently busy processing too many requests. Please wait a few seconds and try again.");
        }
        throw new Error(errorMsg || "Failed to process");
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
    <div className="w-full">
      <div className="tab-group">
        <button 
          className={`tab-item ${activeTab === "image" ? "active" : ""}`}
          onClick={() => setActiveTab("image")}
          disabled={isUploading}
        >
          <ImageIcon size={14} />
          Upload Image/PDF
        </button>
        <button 
          className={`tab-item ${activeTab === "text" ? "active" : ""}`}
          onClick={() => setActiveTab("text")}
          disabled={isUploading}
        >
          <ClipboardList size={14} />
          Paste Text
        </button>
        <button 
          className={`tab-item ${activeTab === "whatsapp" ? "active" : ""}`}
          onClick={() => setActiveTab("whatsapp")}
          disabled={isUploading}
        >
          <MessageCircle size={14} />
          WhatsApp Import
        </button>
      </div>

      {activeTab === "image" && (
        <div 
          className="dropzone"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          style={isDragging ? { borderColor: "var(--acc)", background: "var(--acc-soft)" } : {}}
        >
          <input 
            id="file-upload-input"
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept="image/*,application/pdf"
            onChange={handleFileSelect}
          />
          {isUploading ? (
            <>
              <Loader2 className="dropzone-icon animate-spin" style={{ color: "var(--acc)" }} />
              <p className="dropzone-headline" style={{ color: "var(--text1)" }}>Processing with AI...</p>
              <p className="dropzone-sub">{uploadStatus || "Extracting details from your file"}</p>
            </>
          ) : (
            <>
              <CloudUpload className="dropzone-icon" />
              <p className="dropzone-headline">Drag and drop a notice, or <span className="link">Select File</span></p>
              <p className="dropzone-sub">Supports JPG, PNG, PDF up to 10MB</p>
              <button type="button" className="btn-secondary pointer-events-none mt-[8px]">Select File</button>
            </>
          )}
        </div>
      )}

      {activeTab === "text" && (
        <div className="flex flex-col space-y-4 mb-[30px]">
          <textarea 
            className="flex min-h-[140px] w-full rounded-[12px] border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-[14px] shadow-sm placeholder-[var(--text3)] focus-visible:outline-none focus-visible:border-[var(--acc)] disabled:cursor-not-allowed disabled:opacity-50 resize-y"
            placeholder="Paste the raw text of the notice here..."
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            disabled={isUploading}
          />
          <button 
            onClick={handleTextSubmit} 
            disabled={isUploading || !textInput.trim()}
            className="btn-primary w-full sm:w-auto self-end flex items-center justify-center gap-2"
          >
            {isUploading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</>
            ) : (
              "Extract Notice"
            )}
          </button>
        </div>
      )}

      {activeTab === "whatsapp" && (
        <div 
          className="dropzone"
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
          style={isDragging ? { borderColor: "var(--acc)", background: "var(--acc-soft)" } : {}}
        >
          {isUploading ? (
            <>
              <Loader2 className="dropzone-icon animate-spin" style={{ color: "var(--acc)" }} />
              <p className="dropzone-headline" style={{ color: "var(--acc)" }}>Scanning Chat Export...</p>
              <p className="dropzone-sub">{uploadStatus || "This may take a minute for large chats."}</p>
            </>
          ) : (
            <>
              <MessageCircle className="dropzone-icon" />
              <p className="dropzone-headline" style={{ color: "var(--text1)" }}>Import WhatsApp Export</p>
              <p className="dropzone-sub" style={{ maxWidth: "280px" }}>Open WhatsApp → Chat → Export Chat → Without Media</p>
              <button type="button" className="btn-secondary pointer-events-none mt-[8px]">Select .txt File</button>
            </>
          )}
        </div>
      )}

    </div>
  );
}
