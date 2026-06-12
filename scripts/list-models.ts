import "dotenv/config";

async function main() {
  const key = process.env.GEMINI_API_KEY;
  console.log("Using key:", key?.substring(0, 5) + "...");
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
  const data = await res.json();
  
  if (data.error) {
    console.error("API Error:", data.error);
    return;
  }
  
  const models = data.models || [];
  console.log("Available models:");
  models.forEach((m: any) => {
    if (m.name.includes("gemini")) {
      console.log("- " + m.name + " (supported: " + m.supportedGenerationMethods?.join(", ") + ")");
    }
  });
}

main().catch(console.error);
