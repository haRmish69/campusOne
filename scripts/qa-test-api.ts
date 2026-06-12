import fs from "fs";

async function runQATests() {
  console.log("=== QA TEST: WhatsApp Importer ===");
  
  const dummyChat = `
12/06/2026, 09:00 - Alice: Hey everyone, good morning!
12/06/2026, 09:05 - Bob: Morning Alice.
12/06/2026, 10:30 - Admin: ATTENTION: The Mid-Semester examinations for all 2nd-year B.Tech students will commence from June 20th. Detailed schedule attached.
  `;
  
  try {
    console.log("Sending WhatsApp request...");
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
    
    const res = await fetch("http://localhost:3000/api/whatsapp/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileContent: dummyChat }),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    const data = await res.json();
    console.log("WhatsApp Response Status:", res.status);
    console.log("WhatsApp Response Data:", data);
  } catch (error) {
    console.error("❌ WhatsApp request failed:", error);
  }

  console.log("\n=== QA TEST: Email Sync ===");
  try {
    console.log("Sending Email Sync request...");
    const res = await fetch("http://localhost:3000/api/email/sync", {
      method: "POST"
    });
    
    const data = await res.json();
    console.log("Email Sync Response Status:", res.status);
    console.log("Email Sync Response Data:", data);
  } catch (error) {
    console.error("❌ Email request failed:", error);
  }
}

runQATests();
