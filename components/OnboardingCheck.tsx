"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";

export default function OnboardingCheck() {
  const { isLoaded, userId } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && userId && pathname !== "/onboarding") {
      fetch("/api/user/profile")
        .then((res) => {
          if (res.ok) return res.json();
          return null;
        })
        .then((data) => {
          if (data && data.onboardingDone === false) {
            router.push("/onboarding");
          }
        })
        .catch(console.error);
    }
  }, [isLoaded, userId, pathname, router]);

  return null;
}
