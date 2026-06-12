"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface OnboardingFlowProps {
  onComplete: () => void;
  initialData?: any;
}

export default function OnboardingFlow({ onComplete, initialData }: OnboardingFlowProps) {
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const [name, setName] = useState(initialData?.name || "");
  const [instituteName, setInstituteName] = useState(initialData?.instituteName || "");
  const [branch, setBranch] = useState(initialData?.branch || initialData?.major || "");
  const [year, setYear] = useState<number>(initialData?.year || 1);
  const [topicsInput, setTopicsInput] = useState("");
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [whatsappNumber, setWhatsappNumber] = useState(initialData?.whatsappNumber || "");
  const [contactOptIn, setContactOptIn] = useState(initialData?.contactOptIn || false);

  const router = useRouter();

  const handleAddTopic = () => {
    if (topicsInput.trim() && selectedTopics.length < 5) {
      if (!selectedTopics.includes(topicsInput.trim())) {
        setSelectedTopics([...selectedTopics, topicsInput.trim()]);
      }
      setTopicsInput("");
    }
  };

  const handleRemoveTopic = (topic: string) => {
    setSelectedTopics(selectedTopics.filter(t => t !== topic));
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    setError("");

    try {
      const res = await fetch("/api/peer/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          instituteName,
          branch,
          year,
          whatsappNumber,
          contactOptIn,
          selectedTopics
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to complete onboarding");
      }

      onComplete();
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-xl rounded-2xl shadow-xl border border-gray-100 flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="p-8 pb-4 border-b border-gray-50">
          <div className="flex gap-2 mb-4">
            {[1, 2, 3].map(s => (
              <div key={s} className={`h-1.5 flex-1 rounded-full ${s <= step ? 'bg-blue-600' : 'bg-gray-200'}`} />
            ))}
          </div>
          <h2 className="text-2xl font-bold text-[#0b3558]">Peer Learning Setup</h2>
          <p className="text-gray-500 mt-1">
            {step === 1 && "Let's start with your academic basics."}
            {step === 2 && "What are you confident in?"}
            {step === 3 && "How should peers contact you?"}
          </p>
        </div>

        {/* Body */}
        <div className="p-8 pt-6 flex-1 overflow-y-auto max-h-[60vh]">
          {error && (
            <div className="mb-6 p-3 bg-red-50 border border-red-100 text-red-600 rounded-lg text-sm">
              {error}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="Jane Doe" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Institute Name</label>
                <Input value={instituteName} onChange={e => setInstituteName(e.target.value)} placeholder="MIT" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Branch/Major</label>
                  <Input value={branch} onChange={e => setBranch(e.target.value)} placeholder="Computer Science" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Current Year</label>
                  <select 
                    className="w-full h-10 px-3 py-2 border border-input rounded-md"
                    value={year} 
                    onChange={e => setYear(parseInt(e.target.value))}
                  >
                    {[1, 2, 3, 4, 5].map(y => <option key={y} value={y}>Year {y}</option>)}
                  </select>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">List up to 5 topics you feel confident helping others with. We will also automatically infer expertise from your class schedule.</p>
              
              <div className="flex gap-2">
                <Input 
                  value={topicsInput} 
                  onChange={e => setTopicsInput(e.target.value)} 
                  onKeyDown={e => e.key === "Enter" && (e.preventDefault(), handleAddTopic())}
                  placeholder="e.g. Calculus, UI Design..." 
                  disabled={selectedTopics.length >= 5}
                />
                <Button type="button" onClick={handleAddTopic} disabled={selectedTopics.length >= 5 || !topicsInput.trim()}>Add</Button>
              </div>

              <div className="flex flex-wrap gap-2 mt-4">
                {selectedTopics.map(topic => (
                  <div key={topic} className="flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm font-medium border border-blue-100">
                    {topic}
                    <button onClick={() => handleRemoveTopic(topic)} className="hover:text-blue-900">&times;</button>
                  </div>
                ))}
                {selectedTopics.length === 0 && (
                  <div className="text-sm text-gray-400 italic">No topics added yet.</div>
                )}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <p className="text-sm text-gray-600">If you accept a match, how should the peer reach you? This is only revealed to peers you explicitly approve.</p>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp / Phone Number</label>
                <Input value={whatsappNumber} onChange={e => setWhatsappNumber(e.target.value)} placeholder="+1234567890" />
              </div>

              <label className="flex items-start gap-3 mt-4 cursor-pointer group">
                <div className="flex items-center h-5">
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    checked={contactOptIn}
                    onChange={(e) => setContactOptIn(e.target.checked)}
                  />
                </div>
                <div className="text-sm text-gray-700 group-hover:text-gray-900">
                  I agree to share my contact number with matched peers upon my approval.
                </div>
              </label>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-between rounded-b-2xl">
          <Button variant="outline" onClick={() => setStep(step - 1)} disabled={step === 1 || isLoading}>
            Back
          </Button>
          
          {step < 3 ? (
            <Button className="bg-[#006bff] hover:bg-blue-700 text-white" onClick={() => setStep(step + 1)}>
              Continue
            </Button>
          ) : (
            <Button className="bg-[#006bff] hover:bg-blue-700 text-white" onClick={handleSubmit} disabled={isLoading || (!!whatsappNumber && !contactOptIn)}>
              {isLoading ? "Saving..." : "Finish Setup"}
            </Button>
          )}
        </div>

      </div>
    </div>
  );
}
