"use client";

import { useState, useRef } from "react";
import { UploadCloud, FileText, Loader2, Image as ImageIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export function FileUpload({ apiEndpoint = "/api/ingest" }: { apiEndpoint?: string }) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
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
      toast.error("Please upload an image or PDF file.");
      return;
    }

    setIsUploading(true);
    
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = e.target?.result as string;
        await submitNotice("image", base64);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error(error);
      toast.error("Failed to read file");
      setIsUploading(false);
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
      toast.error("Please enter some text");
      return;
    }
    setIsUploading(true);
    await submitNotice("text", textInput);
  };

  const submitNotice = async (type: "image" | "text", data: string) => {
    try {
      const res = await fetch(apiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, data }),
      });

      const json = await res.json();
      
      if (!res.ok) {
        throw new Error(json.error || "Failed to process notice");
      }

      toast.success("Notice saved successfully!");
      setTextInput("");
      router.refresh();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "An error occurred");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <Card className="w-full shadow-sm">
      <CardContent className="pt-6">
        <Tabs defaultValue="upload" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="upload" disabled={isUploading}>
              <ImageIcon className="w-4 h-4 mr-2" /> Upload Image/PDF
            </TabsTrigger>
            <TabsTrigger value="text" disabled={isUploading}>
              <FileText className="w-4 h-4 mr-2" /> Paste Text
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
                  <p className="text-sm text-muted-foreground mt-2">Extracting details from your file</p>
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
        </Tabs>
      </CardContent>
    </Card>
  );
}
