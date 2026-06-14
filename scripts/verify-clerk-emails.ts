import { createClerkClient } from "@clerk/nextjs/server";
import * as dotenv from "dotenv";
import * as fs from "fs";

// Load env vars
dotenv.config({ path: ".env" });
if (fs.existsSync(".env.local")) {
  dotenv.config({ path: ".env.local", override: true });
}

const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

async function main() {
  console.log("Verifying emails for seed users to bypass OTP...");
  
  const emails = ["24je01@gmail.com", "24je02@gmail.com", "24je03@gmail.com"];

  for (const email of emails) {
    try {
      const users = await clerkClient.users.getUserList({ emailAddress: [email] });
      if (users.data && users.data.length > 0) {
        const user = users.data[0];
        const emailObj = user.emailAddresses[0];
        if (emailObj) {
          // Mark the email as verified to stop Clerk from asking for an email code
          await clerkClient.emailAddresses.updateEmailAddress(emailObj.id, { verified: true });
          console.log(`✅ Verified ${email}`);
        }
      }
    } catch (e: any) {
      console.error(`Failed to verify ${email}:`, e.message || e);
    }
  }
}

main();
