"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@clerk/nextjs";

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const { isLoaded, userId } = useAuth();

  // Basic Info
  const [name, setName] = useState("");
  const [gender, setGender] = useState("Prefer not to say");
  const [instituteName, setInstituteName] = useState("");

  // Academics
  const [branch, setBranch] = useState("");
  const [gradYear, setGradYear] = useState<string>("");

  // Peer Learning
  const [topicsInput, setTopicsInput] = useState("");
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [contactOptIn, setContactOptIn] = useState(false);

  const router = useRouter();

  useEffect(() => {
    // If they already have onboardingDone = true, kick them out to dashboard
    async function checkStatus() {
      if (userId) {
        const res = await fetch("/api/user/profile");
        if (res.ok) {
          const data = await res.json();
          if (data?.onboardingDone) {
            router.push("/dashboard");
          } else if (data) {
            // Pre-fill if some data already exists
            if (data.name) setName(data.name);
            if (data.gender) setGender(data.gender);
            if (data.instituteName) setInstituteName(data.instituteName);
            if (data.major) setBranch(data.major);
            if (data.gradYear) setGradYear(data.gradYear.toString());
            if (data.whatsappNumber) setWhatsappNumber(data.whatsappNumber);
          }
        }
      }
    }
    checkStatus();
  }, [userId, router]);

  if (!isLoaded) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50">Loading...</div>;
  }

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
      // Calculate current year (1-5) from gradYear roughly for peer learning API
      const currentCalendarYear = new Date().getFullYear();
      const parsedGradYear = parseInt(gradYear);
      let calculatedYear = 4 - (parsedGradYear - currentCalendarYear);
      if (calculatedYear < 1) calculatedYear = 1;
      if (calculatedYear > 5) calculatedYear = 5;

      const res = await fetch("/api/peer/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          instituteName,
          branch,
          year: calculatedYear,
          whatsappNumber,
          contactOptIn,
          selectedTopics
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to complete onboarding");
      }

      // Also patch gender and strict gradYear to main profile API
      await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gender,
          gradYear: parsedGradYear
        })
      });

      router.push("/dashboard");
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-xl rounded-2xl shadow-xl border border-gray-100 flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="p-8 pb-4 border-b border-gray-50">
          <div className="flex gap-2 mb-4">
            {[1, 2, 3].map(s => (
              <div key={s} className={`h-1.5 flex-1 rounded-full ${s <= step ? 'bg-blue-600' : 'bg-gray-200'}`} />
            ))}
          </div>
          <h2 className="text-2xl font-bold text-[#0b3558]">Welcome to CampusFlow</h2>
          <p className="text-gray-500 mt-1">
            {step === 1 && "Let's start with the basics."}
            {step === 2 && "Tell us about your academics."}
            {step === 3 && "Set up your Peer Learning profile."}
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name <span className="text-red-500">*</span></label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="Jane Doe" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                <select
                  className="w-full h-11 px-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white"
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                >
                  <option value="Prefer not to say">Prefer not to say</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Institute Name <span className="text-red-500">*</span></label>
                <Input value={instituteName} onChange={e => setInstituteName(e.target.value)} placeholder="e.g. MIT" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Branch / Major <span className="text-red-500">*</span></label>
                <Input value={branch} onChange={e => setBranch(e.target.value)} placeholder="e.g. Computer Science" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Graduation Year <span className="text-red-500">*</span></label>
                <Input 
                  type="number"
                  value={gradYear} 
                  onChange={e => setGradYear(e.target.value)} 
                  placeholder="e.g. 2026" 
                  min={new Date().getFullYear() - 1}
                  max={new Date().getFullYear() + 6}
                  required 
                />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">Topics you can help peers with (Optional)</p>
                <p className="text-xs text-gray-500 mb-3">List up to 5 topics you feel confident in.</p>
                
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
                </div>
              </div>

              <hr className="border-gray-100" />

              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">WhatsApp / Phone Number (Optional)</p>
                <p className="text-xs text-gray-500 mb-3">If you accept a peer learning match, how should they reach you? This is only revealed to peers you explicitly approve.</p>
                <Input value={whatsappNumber} onChange={e => setWhatsappNumber(e.target.value)} placeholder="+1234567890" />
                
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
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-between rounded-b-2xl">
          <Button variant="outline" onClick={() => setStep(step - 1)} disabled={step === 1 || isLoading}>
            Back
          </Button>
          
          {step < 3 ? (
            <Button 
              className="bg-[#006bff] hover:bg-blue-700 text-white" 
              onClick={() => setStep(step + 1)}
              disabled={
                (step === 1 && (!name.trim())) || 
                (step === 2 && (!instituteName.trim() || !branch.trim() || !gradYear))
              }
            >
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
