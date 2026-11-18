"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { User, Loader2, Save } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export default function ProfilePage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [name, setName] = useState("");
  const [instituteName, setInstituteName] = useState("");
  const [major, setMajor] = useState("");
  const [gradYear, setGradYear] = useState("");
  const [gender, setGender] = useState("Prefer not to say");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [contactOptIn, setContactOptIn] = useState(false);
  const [year, setYear] = useState("1");

  const router = useRouter();

  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await fetch("/api/user/profile");
        if (res.ok) {
          const profile = await res.json();
          if (profile) {
            setName(profile.name || "");
            setInstituteName(profile.instituteName || "");
            setMajor(profile.major || "");
            setGradYear(profile.gradYear ? String(profile.gradYear) : "");
            setGender(profile.gender || "Prefer not to say");
            setWhatsappNumber(profile.whatsappNumber || "");
            setContactOptIn(profile.contactOptIn || false);
            setYear(profile.year ? String(profile.year) : "1");
          }
        }
      } catch (err) {
        console.error("Failed to load profile", err);
        toast.error("Failed to load profile");
      } finally {
        setIsLoading(false);
      }
    }
    fetchProfile();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          name, instituteName, major, gradYear, gender,
          branch: major, whatsappNumber, contactOptIn, year: parseInt(year) 
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update profile");
      }

      toast.success("Profile updated successfully!");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-2xl">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-primary/10 rounded-full text-primary">
          <User className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Your Profile</h1>
          <p className="text-muted-foreground mt-1">
            Manage your academic details to help CampusOne personalize your experience.
          </p>
        </div>
      </div>

      <Card className="border-border/60 shadow-sm">
        <CardHeader>
          <CardTitle>Academic Information</CardTitle>
          <CardDescription>
            This information powers the Study Group Matchmaker and Campus Pulse features.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Full Name <span className="text-[var(--color-ember-orange)]">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Jane Doe"
                className="flex h-10 w-full rounded-[12px] border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Institute Name <span className="text-[var(--color-ember-orange)]">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Thapar Institute"
                className="flex h-10 w-full rounded-[12px] border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={instituteName}
                onChange={(e) => setInstituteName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Major / Branch <span className="text-[var(--color-ember-orange)]">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Computer Science"
                className="flex h-10 w-full rounded-[12px] border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={major}
                onChange={(e) => setMajor(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Current Year <span className="text-[var(--color-ember-orange)]">*</span>
                </label>
                <select
                  className="flex h-10 w-full rounded-[12px] border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                >
                  {[1, 2, 3, 4, 5].map(y => <option key={y} value={y}>Year {y}</option>)}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Graduation Year <span className="text-[var(--color-ember-orange)]">*</span>
                </label>
                <input
                  type="number"
                  required
                  placeholder="e.g. 2026"
                  min={new Date().getFullYear()}
                  max={new Date().getFullYear() + 6}
                  className="flex h-10 w-full rounded-[12px] border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={gradYear}
                  onChange={(e) => setGradYear(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Gender
                </label>
                <select
                  className="flex h-10 w-full rounded-[12px] border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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

            <div className="space-y-4 pt-4 border-t border-border/40">
              <h3 className="text-lg font-medium">Peer Learning Contact</h3>
              <p className="text-sm text-muted-foreground">Used for Study Group matching. Only revealed to peers you explicitly approve.</p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    WhatsApp Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. +1234567890"
                    className="flex h-10 w-full rounded-[12px] border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={whatsappNumber}
                    onChange={(e) => setWhatsappNumber(e.target.value)}
                  />
                </div>
                <div className="flex items-center space-x-2 pt-6">
                  <input
                    type="checkbox"
                    id="contactOptIn"
                    checked={contactOptIn}
                    onChange={(e) => setContactOptIn(e.target.checked)}
                    className="w-4 h-4 text-[var(--color-ember-orange)] border-[var(--color-paper)] rounded focus:ring-[var(--color-ember-orange)]"
                  />
                  <label htmlFor="contactOptIn" className="text-sm font-medium leading-none cursor-pointer">
                    I agree to share contact info with matched peers
                  </label>
                </div>
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <Button type="submit" disabled={isSubmitting} className="gap-2 px-6">
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {isSubmitting ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
