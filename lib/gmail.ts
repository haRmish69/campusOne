import { google } from "googleapis";

export interface ParsedEmail {
  id: string;
  subject: string;
  from: string;
  date: Date;
  body: string;
}

export async function getRecentEmails(labelName: string = "CampusFlow", maxResults: number = 20): Promise<ParsedEmail[]> {
  const { GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN } = process.env;

  if (!GMAIL_CLIENT_ID || !GMAIL_CLIENT_SECRET || !GMAIL_REFRESH_TOKEN) {
    throw new Error("Email sync not configured");
  }

  const oauth2Client = new google.auth.OAuth2(
    GMAIL_CLIENT_ID,
    GMAIL_CLIENT_SECRET,
    "https://developers.google.com/oauthplayground"
  );

  oauth2Client.setCredentials({
    refresh_token: GMAIL_REFRESH_TOKEN
  });

  const gmail = google.gmail({ version: "v1", auth: oauth2Client });

  // Find the Label ID for the specified label
  const labelsRes = await gmail.users.labels.list({ userId: "me" });
  const labels = labelsRes.data.labels || [];
  const label = labels.find(l => l.name?.toLowerCase() === labelName.toLowerCase());
  
  const q = label ? `label:${label.name}` : `label:${labelName}`;

  // Fetch recent messages
  const res = await gmail.users.messages.list({
    userId: "me",
    q,
    maxResults
  });

  const messages = res.data.messages || [];
  const parsedEmails: ParsedEmail[] = [];

  for (const message of messages) {
    if (!message.id) continue;
    
    const msgRes = await gmail.users.messages.get({
      userId: "me",
      id: message.id,
      format: "full"
    });

    const headers = msgRes.data.payload?.headers || [];
    const subject = headers.find(h => h.name === "Subject")?.value || "No Subject";
    const from = headers.find(h => h.name === "From")?.value || "Unknown";
    const dateStr = headers.find(h => h.name === "Date")?.value;
    const date = dateStr ? new Date(dateStr) : new Date();

    let body = "";
    const parts = msgRes.data.payload?.parts;
    
    if (parts) {
      // Look for plain text first
      const plainTextPart = parts.find(p => p.mimeType === "text/plain");
      if (plainTextPart && plainTextPart.body?.data) {
        body = Buffer.from(plainTextPart.body.data, "base64").toString("utf-8");
      } else {
        // Fallback to HTML and strip tags
        const htmlPart = parts.find(p => p.mimeType === "text/html");
        if (htmlPart && htmlPart.body?.data) {
          const html = Buffer.from(htmlPart.body.data, "base64").toString("utf-8");
          body = html.replace(/<[^>]*>?/gm, "\n").replace(/\s+/g, " ").trim();
        }
      }
    } else if (msgRes.data.payload?.body?.data) {
      // Single part email
      const data = Buffer.from(msgRes.data.payload.body.data, "base64").toString("utf-8");
      if (msgRes.data.payload.mimeType === "text/html") {
        body = data.replace(/<[^>]*>?/gm, "\n").replace(/\s+/g, " ").trim();
      } else {
        body = data;
      }
    }

    parsedEmails.push({
      id: message.id,
      subject,
      from,
      date,
      body
    });
  }

  return parsedEmails;
}
