import { google } from "googleapis";
import * as readline from "readline";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const CLIENT_ID = process.env.GMAIL_CLIENT_ID;
const CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET;

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error(
    "ERROR: GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET must be set in .env.local"
  );
  console.error("See docs/gmail-oauth-setup.md for instructions.");
  process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  "urn:ietf:wg:oauth:2.0:oob"
);

const authUrl = oauth2Client.generateAuthUrl({
  access_type: "offline",
  scope: ["https://www.googleapis.com/auth/gmail.readonly"],
  prompt: "consent", // force consent screen to get refresh_token
});

console.log("\n🔗 Open this URL in your browser:\n");
console.log(authUrl);
console.log("\n");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question("📋 Paste the authorization code here: ", async (code) => {
  try {
    const { tokens } = await oauth2Client.getToken(code.trim());
    console.log("\n✅ Success! Add this to your .env.local:\n");
    console.log(`GMAIL_REFRESH_TOKEN="${tokens.refresh_token}"`);
    console.log("\n");
  } catch (error) {
    console.error("\n❌ Failed to exchange code for token:", error);
  }
  rl.close();
});
