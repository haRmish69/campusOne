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
    return <div className="min-h-screen flex items-center justify-center bg-[var(--color-pearl)]">Loading...</div>;
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
    <div className="min-h-screen bg-[var(--color-pearl)] flex items-center justify-center p-4">
      <div className="bg-[var(--color-canvas-white)] w-full max-w-xl rounded-[20px] shadow-sm border border-[var(--color-paper)] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="p-8 pb-4 border-b border-[var(--color-paper)]">
          <div className="flex gap-2 mb-4">
            {[1, 2, 3].map(s => (
              <div key={s} className={`h-1.5 flex-1 rounded-full ${s <= step ? 'bg-[var(--color-graphite)]' : 'bg-[var(--color-pearl)]'}`} />
            ))}
          </div>
          <h2 className="text-[24px] font-semibold text-[var(--color-graphite)]">Welcome to CampusOne</h2>
          <p className="text-[14px] text-[var(--color-stone)] mt-1">
            {step === 1 && "Let's start with the basics."}
            {step === 2 && "Tell us about your academics."}
            {step === 3 && "Set up your Peer Learning profile."}
          </p>
        </div>

        {/* Body */}
        <div className="p-8 pt-6 flex-1 overflow-y-auto max-h-[60vh]">
          {error && (
            <div className="mb-6 p-3 bg-[var(--color-canvas-white)] border border-[var(--color-ember-orange)] text-[var(--color-ember-orange)] rounded-[12px] text-[13px]">
              {error}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-[13px] font-medium text-[var(--color-graphite)] mb-1">Full Name <span className="text-[var(--color-ember-orange)]">*</span></label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="Jane Doe" required />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-[var(--color-graphite)] mb-1">Gender</label>
                <select
                  className="w-full h-11 px-4 border border-[var(--color-paper)] rounded-[20px] focus:ring-1 focus:ring-[var(--color-ember-orange)] focus:border-[var(--color-ember-orange)] outline-none transition-all bg-[var(--color-canvas-white)] text-[14px]"
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
                <label className="block text-[13px] font-medium text-[var(--color-graphite)] mb-1">Institute Name <span className="text-[var(--color-ember-orange)]">*</span></label>
                <Input value={instituteName} onChange={e => setInstituteName(e.target.value)} placeholder="e.g. MIT" required />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-[var(--color-graphite)] mb-1">Branch / Major <span className="text-[var(--color-ember-orange)]">*</span></label>
                <Input value={branch} onChange={e => setBranch(e.target.value)} placeholder="e.g. Computer Science" required />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-[var(--color-graphite)] mb-1">Graduation Year <span className="text-[var(--color-ember-orange)]">*</span></label>
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
                <p className="text-[13px] font-medium text-[var(--color-graphite)] mb-1">Topics you can help peers with (Optional)</p>
                <p className="text-[12px] text-[var(--color-stone)] mb-3">List up to 5 topics you feel confident in.</p>
                
                <div className="flex gap-2">
                  <Input 
                    value={topicsInput} 
                    onChange={e => setTopicsInput(e.target.value)} 
                    onKeyDown={e => e.key === "Enter" && (e.preventDefault(), handleAddTopic())}
                    placeholder="e.g. Calculus, UI Design..." 
                    disabled={selectedTopics.length >= 5}
                  />
                  <Button type="button" onClick={handleAddTopic} disabled={selectedTopics.length >= 5 || !topicsInput.trim()} className="bg-[var(--color-graphite)] hover:opacity-90 text-white rounded-[30px]">Add</Button>
                </div>

                <div className="flex flex-wrap gap-2 mt-4">
                  {selectedTopics.map(topic => (
                    <div key={topic} className="flex items-center gap-2 bg-[var(--color-pearl)] text-[var(--color-graphite)] px-3 py-1 rounded-[20px] text-[13px] font-medium border border-[var(--color-paper)]">
                      {topic}
                      <button onClick={() => handleRemoveTopic(topic)} className="hover:text-[var(--color-ember-orange)]">&times;</button>
                    </div>
                  ))}
                </div>
              </div>

              <hr className="border-[var(--color-paper)]" />

              <div>
                <p className="text-[13px] font-medium text-[var(--color-graphite)] mb-1">WhatsApp / Phone Number (Optional)</p>
                <p className="text-[12px] text-[var(--color-stone)] mb-3">If you accept a peer learning match, how should they reach you? This is only revealed to peers you explicitly approve.</p>
                <Input value={whatsappNumber} onChange={e => setWhatsappNumber(e.target.value)} placeholder="+1234567890" />
                
                <label className="flex items-start gap-3 mt-4 cursor-pointer group">
                  <div className="flex items-center h-5">
                    <input
                      type="checkbox"
                      className="w-4 h-4 text-[var(--color-ember-orange)] border-[var(--color-paper)] rounded focus:ring-[var(--color-ember-orange)]"
                      checked={contactOptIn}
                      onChange={(e) => setContactOptIn(e.target.checked)}
                    />
                  </div>
                  <div className="text-[13px] text-[var(--color-stone)] group-hover:text-[var(--color-graphite)]">
                    I agree to share my contact number with matched peers upon my approval.
                  </div>
                </label>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-6 bg-[var(--color-pearl)] border-t border-[var(--color-paper)] flex justify-between rounded-b-[20px]">
          <Button variant="outline" onClick={() => setStep(step - 1)} disabled={step === 1 || isLoading} className="rounded-[30px]">
            Back
          </Button>
          
          {step < 3 ? (
            <Button 
              className="bg-[var(--color-ember-orange)] hover:opacity-90 text-white rounded-[30px]" 
              onClick={() => setStep(step + 1)}
              disabled={
                (step === 1 && (!name.trim())) || 
                (step === 2 && (!instituteName.trim() || !branch.trim() || !gradYear))
              }
            >
              Continue
            </Button>
          ) : (
            <Button className="bg-[var(--color-ember-orange)] hover:opacity-90 text-white rounded-[30px]" onClick={handleSubmit} disabled={isLoading || (!!whatsappNumber && !contactOptIn)}>
              {isLoading ? "Saving..." : "Finish Setup"}
            </Button>
          )}
        </div>

      </div>
    </div>
  );
}
