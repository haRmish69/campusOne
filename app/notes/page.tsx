"use client";

import { useState, useEffect, useRef } from "react";
import { 
  FolderOpen, 
  FileText, 
  Plus, 
  Search, 
  Loader2, 
  UploadCloud, 
  ChevronLeft, 
  BookOpen, 
  Sparkles, 
  FileCode,
  Calendar,
  X,
  Eye,
  Download
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

interface Note {
  id: string;
  title: string;
  content: string;
  fileName: string | null;
  fileUrl: string | null;
  subject: string;
  createdAt: string;
}

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [folders, setFolders] = useState<Record<string, Note[]>>({});
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  
  // Search
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Note[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Loading states
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [aiStatus, setAiStatus] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Form states
  const [isOpen, setIsOpen] = useState(false);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [noteSubject, setNoteSubject] = useState("");
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [uploadedFileBase64, setUploadedFileBase64] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchNotes();
  }, []);

  const fetchNotes = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/notes");
      const data = await res.json();
      if (data.success) {
        setNotes(data.notes);
        groupNotesIntoFolders(data.notes);
      } else {
        toast.error("Failed to load notes");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error loading notes");
    } finally {
      setIsLoading(false);
    }
  };

  const groupNotesIntoFolders = (allNotes: Note[]) => {
    const groups: Record<string, Note[]> = {};
    allNotes.forEach((note) => {
      const sub = note.subject || "General";
      if (!groups[sub]) {
        groups[sub] = [];
      }
      groups[sub].push(note);
    });
    setFolders(groups);
  };

  // Trigger search
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchQuery.trim().length > 0) {
        performSearch();
      } else {
        setSearchResults([]);
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const performSearch = async () => {
    setIsSearching(true);
    try {
      const res = await fetch(`/api/notes?search=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      if (data.success) {
        setSearchResults(data.notes);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  // Handle PDF/Image File Upload
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const processFile = async (file: File) => {
    if (file.type !== "application/pdf" && !file.type.startsWith("image/")) {
      toast.error("Unsupported file format", {
        description: "Please upload a PDF document or image.",
      });
      return;
    }

    setUploadedFileName(file.name);
    setIsProcessingAI(true);
    setAiStatus("Reading document file...");

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const base64 = e.target?.result as string;
          setUploadedFileBase64(base64);
          
          setAiStatus("AI is analyzing content and detecting subject folder...");
          const response = await fetch("/api/notes/detect-subject", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ type: "file", data: base64, fileName: file.name }),
          });
          
          let resData;
          if (!response.ok) {
            const text = await response.text();
            let errorMsg = "AI processing failed";
            try {
              resData = JSON.parse(text);
              errorMsg = resData.error || errorMsg;
            } catch (e) {
              if (response.status === 413) errorMsg = "File is too large! Please upload a smaller file.";
              else if (response.status === 404) errorMsg = "Server is still starting up. Please try again in a few seconds.";
              else errorMsg = `Server error: ${response.status}`;
            }
            throw new Error(errorMsg);
          } else {
            resData = await response.json();
            setNoteTitle(resData.title);
            setNoteContent(resData.content);
            setNoteSubject(resData.subject);
            toast.success("AI successfully extracted content & classified folder!", {
              description: `Assigned to: "${resData.subject}"`,
            });
          }
        } catch (innerError: any) {
          console.error("FileReader onload processing error:", innerError);
          toast.error("AI Analysis Failed", {
            description: innerError.message || "Could not auto-classify folder. Please fill manually.",
          });
        } finally {
          setIsProcessingAI(false);
          setAiStatus("");
        }
      };
      
      reader.onerror = () => {
        toast.error("Failed to read the selected file.");
        setIsProcessingAI(false);
        setAiStatus("");
      };

      reader.readAsDataURL(file);
    } catch (error: any) {
      console.error("FileReader startup error:", error);
      toast.error("Failed to read file");
      setIsProcessingAI(false);
      setAiStatus("");
    }
  };



  // Reset form
  const resetForm = () => {
    setNoteTitle("");
    setNoteContent("");
    setNoteSubject("");
    setUploadedFileName(null);
    setUploadedFileBase64(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Save Note
  const saveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteTitle.trim() || !noteSubject.trim()) {
      toast.error("Missing fields", { description: "Please enter title and folder/subject." });
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: noteTitle,
          content: noteContent,
          subject: noteSubject,
          fileName: uploadedFileName,
          fileUrl: uploadedFileBase64,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success("Note saved successfully!");
        setIsOpen(false);
        resetForm();
        fetchNotes();
      } else {
        throw new Error(data.error || "Failed to save note");
      }
    } catch (error: any) {
      console.error(error);
      toast.error("Save failed", { description: error.message || "An unexpected error occurred." });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8 pb-32">
      {/* Decorative Blob Shapes */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-ultraviolet/5 rounded-full filter blur-3xl pointer-events-none -z-10" />
      <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-cyan-pop/5 rounded-full filter blur-3xl pointer-events-none -z-10" />

      {/* Top Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/40 pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-midnight-navy">My Study Library</h1>
          <p className="text-muted-foreground mt-1">Keep all your study notes, lecture summaries, and uploaded PDFs in one location.</p>
        </div>
        
        {/* Search & Actions */}
        <div className="flex items-center gap-3 self-stretch md:self-auto">
          <div className="relative flex-1 md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search note contents or PDFs..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10 w-full rounded-md border-border bg-card shadow-sm focus-visible:ring-signal-blue"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery("")} 
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-carbon"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Add Note Button */}
          <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="bg-signal-blue text-white hover:bg-signal-blue/90 shadow-sm h-10 shrink-0">
                <Plus className="w-4 h-4 mr-2" /> Add Note
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-4xl w-full bg-card border-border/60">
              <DialogHeader>
                <DialogTitle className="text-midnight-navy font-bold flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-signal-blue animate-pulse" /> Add Study Document
                </DialogTitle>
                <DialogDescription>
                  Upload a PDF or image file. Our AI will automatically detect the subject and organize it into the correct folder.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 mt-4">
                <div 
                  onClick={() => !isProcessingAI && fileInputRef.current?.click()}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-lg p-10 text-center transition-colors cursor-pointer flex flex-col items-center justify-center min-h-[220px]
                    ${isDragging ? "border-signal-blue bg-signal-blue/5" : "border-border/50 bg-muted/20 hover:bg-muted/30"}
                    ${isProcessingAI ? "opacity-50 pointer-events-none" : ""}`}
                >
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="application/pdf,image/*"
                    onChange={handleFileSelect}
                  />
                  {isProcessingAI ? (
                    <>
                      <Loader2 className="w-10 h-10 text-signal-blue animate-spin mb-4" />
                      <h4 className="font-semibold text-midnight-navy">{aiStatus || "Processing document..."}</h4>
                      <p className="text-xs text-muted-foreground mt-2">Gemini is reading pages and identifying the subject folder...</p>
                    </>
                  ) : (
                    <>
                      <UploadCloud className="w-12 h-12 text-muted-foreground mb-4" />
                      <h4 className="font-semibold text-midnight-navy">Drag & Drop PDF or Image</h4>
                      <p className="text-xs text-muted-foreground mt-2 mb-4">Support PDF, PNG, JPG (Max 10MB)</p>
                      {uploadedFileName ? (
                        <Badge variant="secondary" className="bg-signal-blue/10 text-signal-blue border-transparent">
                          Selected: {uploadedFileName}
                        </Badge>
                      ) : (
                        <Button variant="outline" size="sm" type="button">Browse Files</Button>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Shared Metadata Fields */}
              <form onSubmit={saveNote} className="space-y-4 pt-4 border-t border-border/40 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Document Title</Label>
                  <Input 
                    id="title" 
                    placeholder="e.g. Memory Management & Paging" 
                    value={noteTitle}
                    onChange={(e) => setNoteTitle(e.target.value)}
                    disabled={isProcessingAI || isSaving}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="subject" className="flex items-center gap-1.5">
                      Subject / Folder Name
                      <Badge variant="outline" className="text-[10px] py-0 border-signal-blue/20 text-signal-blue font-normal flex items-center gap-0.5">
                        <Sparkles className="w-2.5 h-2.5" /> AI Classifies
                      </Badge>
                    </Label>
                    <Input 
                      id="subject" 
                      placeholder="e.g. Operating Systems" 
                      value={noteSubject}
                      onChange={(e) => setNoteSubject(e.target.value)}
                      disabled={isProcessingAI || isSaving}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="file_indicator">Attachment</Label>
                    <div className="h-10 px-3 py-2 rounded-md border border-input bg-muted/30 text-sm text-muted-foreground flex items-center gap-2">
                      {uploadedFileName ? (
                        <>
                          <FileText className="w-4 h-4 text-signal-blue shrink-0" />
                          <span className="truncate">{uploadedFileName}</span>
                        </>
                      ) : (
                        <span className="text-muted-foreground/60 italic">No file attached</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => { setIsOpen(false); resetForm(); }}
                    disabled={isSaving || isProcessingAI}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    className="bg-signal-blue text-white hover:bg-signal-blue/90"
                    disabled={isSaving || isProcessingAI || !noteTitle || !noteSubject}
                  >
                    {isSaving ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
                    ) : (
                      "Save Study Document"
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Main Grid View */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center min-h-[300px] text-muted-foreground gap-3">
          <Loader2 className="w-8 h-8 text-signal-blue animate-spin" />
          <p className="text-sm">Loading your study library...</p>
        </div>
      ) : searchQuery ? (
        /* SEARCH RESULTS VIEW */
        <div className="space-y-6 animate-fade-in">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-midnight-navy">
              Search Results for "{searchQuery}"
            </h2>
            <Badge variant="secondary" className="bg-fog text-midnight-navy font-semibold">
              {searchResults.length} Match{searchResults.length !== 1 && "es"}
            </Badge>
          </div>

          {isSearching ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="w-6 h-6 animate-spin text-signal-blue" />
            </div>
          ) : searchResults.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {searchResults.map((note) => (
                <Card 
                  key={note.id} 
                  className="hover:shadow-sm transition-all duration-200 border-border/60 cursor-pointer flex flex-col min-h-[180px] bg-card"
                  onClick={() => setSelectedNote(note)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <Badge variant="outline" className="border-signal-blue/30 text-signal-blue text-xs shrink-0 max-w-[120px] truncate">
                        📁 {note.subject}
                      </Badge>
                      {note.fileName && (
                        <Badge variant="secondary" className="bg-signal-blue/10 text-signal-blue text-[10px] px-1.5 font-bold shrink-0">
                          PDF
                        </Badge>
                      )}
                    </div>
                    <CardTitle className="text-base text-midnight-navy font-bold leading-snug mt-2 line-clamp-1">
                      {note.title}
                    </CardTitle>
                    <CardDescription className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(note.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0 text-sm text-muted-foreground line-clamp-3 leading-relaxed flex-1">
                    {note.content.replace(/[#*`]/g, "").substring(0, 150)}...
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-card border border-border/40 rounded-xl space-y-3">
              <FileText className="w-12 h-12 text-muted-foreground mx-auto" />
              <h4 className="font-semibold text-midnight-navy">No matching documents found</h4>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                We couldn't find any notes or PDFs containing "{searchQuery}". Try searching other keywords.
              </p>
            </div>
          )}
        </div>
      ) : selectedFolder ? (
        /* SINGLE FOLDER VIEW */
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-border/30 pb-4">
            <button 
              onClick={() => setSelectedFolder(null)}
              className="flex items-center gap-1.5 text-sm text-slate-blue hover:text-midnight-navy font-semibold transition-colors"
            >
              <ChevronLeft className="w-4 h-4" /> Back to Library
            </button>
            <div className="flex items-center gap-2">
              <FolderOpen className="w-5 h-5 text-signal-blue" />
              <h2 className="text-xl font-bold text-midnight-navy">{selectedFolder}</h2>
              <Badge className="bg-fog text-midnight-navy border-transparent font-bold">
                {folders[selectedFolder]?.length || 0} items
              </Badge>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {folders[selectedFolder]?.map((note) => (
              <Card 
                key={note.id} 
                className="hover:shadow-sm transition-all duration-200 border-border/60 cursor-pointer flex flex-col min-h-[180px] bg-card"
                onClick={() => setSelectedNote(note)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between w-full">
                    <CardDescription className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(note.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </CardDescription>
                    {note.fileName && (
                      <Badge variant="secondary" className="bg-signal-blue/10 text-signal-blue text-[10px] px-1.5 font-bold">
                        PDF
                      </Badge>
                    )}
                  </div>
                  <CardTitle className="text-base text-midnight-navy font-bold leading-snug mt-2 line-clamp-1">
                    {note.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 text-sm text-muted-foreground line-clamp-3 leading-relaxed flex-1">
                  {note.content.replace(/[#*`]/g, "").substring(0, 150)}...
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ) : (
        /* GENERAL FOLDERS LIST VIEW */
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-midnight-navy">Subject Folders</h2>
          {Object.keys(folders).length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {Object.keys(folders).map((folderName) => (
                <div 
                  key={folderName}
                  onClick={() => setSelectedFolder(folderName)}
                  className="bg-card hover:bg-muted/10 border border-border/60 rounded-xl p-6 shadow-sm hover:shadow transition-all duration-200 cursor-pointer flex flex-col space-y-4"
                >
                  <div className="w-12 h-12 bg-signal-blue/10 rounded-lg flex items-center justify-center">
                    <FolderOpen className="w-6 h-6 text-signal-blue" />
                  </div>
                  <div>
                    <h3 className="font-bold text-midnight-navy text-lg truncate">{folderName}</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {folders[folderName].length} document{folders[folderName].length !== 1 && "s"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-20 bg-card border border-border/40 rounded-2xl space-y-4">
              <BookOpen className="w-16 h-16 text-muted-foreground/60 mx-auto" />
              <h3 className="text-xl font-bold text-midnight-navy">Your library is empty</h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                Upload PDFs or write study notes manually. AI will organize them automatically by subject folders.
              </p>
              <Button onClick={() => setIsOpen(true)} className="bg-signal-blue hover:bg-signal-blue/90 text-white">
                Create your first note
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Detail Reader Modal */}
      <Dialog open={!!selectedNote} onOpenChange={(open) => { if (!open) setSelectedNote(null); }}>
        <DialogContent className="sm:max-w-3xl w-full max-h-[85vh] flex flex-col bg-card border-border/60 overflow-hidden">
          <DialogHeader className="border-b border-border/40 pb-4 shrink-0">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className="border-signal-blue/30 text-signal-blue">
                📁 {selectedNote?.subject}
              </Badge>
              {selectedNote?.fileName && (
                <Badge variant="secondary" className="bg-signal-blue/10 text-signal-blue font-bold">
                  PDF ATTACHED
                </Badge>
              )}
            </div>
            <DialogTitle className="text-xl text-midnight-navy font-bold">{selectedNote?.title}</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              Created on {selectedNote && new Date(selectedNote.createdAt).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto pr-2 py-4">
            {selectedNote?.fileName && selectedNote?.fileUrl && (
              <div className="mb-6 bg-muted/20 border border-border/40 p-4 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-signal-blue/10 rounded flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5 text-signal-blue" />
                  </div>
                  <div className="overflow-hidden">
                    <h5 className="font-bold text-midnight-navy text-sm truncate">{selectedNote.fileName}</h5>
                    <p className="text-xs text-muted-foreground">Original PDF Document</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => {
                      try {
                        const dataUrl = selectedNote.fileUrl;
                        const match = dataUrl.match(/^data:(.*?);base64,(.*)$/);
                        if (!match) return;
                        const mime = match[1];
                        const b64 = match[2];
                        const byteChars = atob(b64);
                        const byteArrays = [];
                        for (let offset = 0; offset < byteChars.length; offset += 1024) {
                          const slice = byteChars.slice(offset, offset + 1024);
                          const byteNumbers = new Array(slice.length);
                          for (let i = 0; i < slice.length; i++) {
                            byteNumbers[i] = slice.charCodeAt(i);
                          }
                          byteArrays.push(new Uint8Array(byteNumbers));
                        }
                        const blob = new Blob(byteArrays, { type: mime });
                        const blobUrl = URL.createObjectURL(blob);
                        window.open(blobUrl, '_blank');
                      } catch (e) {
                        console.error("Failed to open file:", e);
                      }
                    }}
                    className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 border border-emerald-200 bg-card hover:bg-emerald-50 px-3 py-1.5 rounded transition-all flex items-center gap-1.5"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    View
                  </button>
                  <a 
                    href={selectedNote.fileUrl} 
                    download={selectedNote.fileName} 
                    className="text-xs font-semibold text-signal-blue hover:text-signal-blue/90 border border-signal-blue/20 bg-card hover:bg-signal-blue/5 px-3 py-1.5 rounded transition-all flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download
                  </a>
                </div>
              </div>
            )}
            
            <div className="prose prose-sm dark:prose-invert max-w-none leading-relaxed text-carbon prose-headings:text-midnight-navy prose-a:text-signal-blue">
              <ReactMarkdown>{selectedNote?.content || ""}</ReactMarkdown>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
