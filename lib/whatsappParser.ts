export interface ParsedWhatsAppMessage {
  timestamp: Date | null;
  sender: string;
  message: string;
}

/**
 * Parses a raw WhatsApp chat export (.txt) into an array of structured messages.
 * Handles multiline messages and filters out system messages/encryption notices.
 */
export function parseWhatsAppExport(rawText: string): ParsedWhatsAppMessage[] {
  const lines = rawText.split(/\r?\n/);
  const messages: ParsedWhatsAppMessage[] = [];
  
  let currentMsg: ParsedWhatsAppMessage | null = null;
  
  // Matches: "15/02/2026, 14:30 - Sender Name: Message text..."
  // Matches: "2/15/26, 2:30 PM - Sender Name: Message text..."
  const regexAndroid = /^(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}, \d{1,2}:\d{2}(?::\d{2})?(?:\s?[aApP][mM])?)\s*-\s*(.+?):\s*(.*)$/;
  
  // Matches: "[15/02/2026, 14:30:00] Sender Name: Message text..." (iOS)
  const regexIOS = /^\[(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}, \d{1,2}:\d{2}(?::\d{2})?(?:\s?[aApP][mM])?)\]\s*(.+?):\s*(.*)$/;

  for (const line of lines) {
    let match = line.match(regexAndroid) || line.match(regexIOS);
    
    if (match) {
      // New message started, push the old one if it exists
      if (currentMsg) {
        messages.push(currentMsg);
      }
      
      const dateStr = match[1];
      const sender = match[2].trim();
      const text = match[3];
      
      currentMsg = {
        timestamp: parseDateString(dateStr),
        sender,
        message: text
      };
    } else {
      // Not a new message. Could be a system message or a continuation of the previous message.
      // If it looks like a system message (Android: "DD/MM/YYYY, HH:MM - System message..."), skip it.
      const sysMatch = line.match(/^(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}, \d{1,2}:\d{2}(?::\d{2})?(?:\s?[aApP][mM])?)\s*-\s*(.*)$/);
      const sysMatchIOS = line.match(/^\[(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}, \d{1,2}:\d{2}(?::\d{2})?(?:\s?[aApP][mM])?)\]\s*(.*)$/);
      
      if (sysMatch || sysMatchIOS) {
        // It's a system message (like "Messages and calls are end-to-end encrypted" or "John left")
        // We push the current message and start fresh
        if (currentMsg) {
          messages.push(currentMsg);
          currentMsg = null;
        }
        continue; // skip this line
      }
      
      // Otherwise, it's a multiline continuation of the current message
      if (currentMsg) {
        currentMsg.message += "\n" + line;
      }
    }
  }
  
  if (currentMsg) {
    messages.push(currentMsg);
  }
  
  // Filter out noise
  const filtered = messages.filter(m => {
    const text = m.message.trim();
    if (text.length < 10) return false;
    if (text.includes("<Media omitted>")) return false;
    if (text.includes("This message was deleted")) return false;
    if (text.includes("end-to-end encrypted")) return false;
    if (text.includes("null")) return false;
    return true;
  });
  
  return filtered;
}

/**
 * Attempts to parse WhatsApp date strings into JS Date objects.
 * "15/02/2026, 14:30" or "2/15/26, 2:30 PM"
 */
function parseDateString(dateStr: string): Date | null {
  try {
    // Standardize spaces
    const cleanStr = dateStr.replace(/[\u202F\u00A0]/g, ' ').trim();
    
    // Split into date and time
    const [datePart, timePart] = cleanStr.split(', ');
    if (!datePart || !timePart) return new Date(); // fallback
    
    // Split date components
    const dateSeparator = datePart.includes('/') ? '/' : '-';
    let parts = datePart.split(dateSeparator);
    if (parts.length !== 3) return new Date();
    
    let day, month, year;
    // Heuristic: if first part > 12, it must be DD/MM.
    // If second part > 12, it must be MM/DD.
    if (parseInt(parts[0]) > 12) {
      day = parts[0]; month = parts[1]; year = parts[2];
    } else if (parseInt(parts[1]) > 12) {
      month = parts[0]; day = parts[1]; year = parts[2];
    } else {
      // Default to DD/MM/YYYY for most of the world outside US
      day = parts[0]; month = parts[1]; year = parts[2];
    }
    
    if (year.length === 2) {
      year = "20" + year;
    }
    
    // Parse time
    let hours = 0;
    let mins = 0;
    
    const isPM = timePart.toLowerCase().includes('pm');
    const isAM = timePart.toLowerCase().includes('am');
    
    const timeOnly = timePart.replace(/[a-zA-Z]/g, '').trim();
    const tParts = timeOnly.split(':');
    
    hours = parseInt(tParts[0]);
    mins = parseInt(tParts[1]);
    
    if (isPM && hours < 12) hours += 12;
    if (isAM && hours === 12) hours = 0;
    
    const d = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), hours, mins);
    if (isNaN(d.getTime())) return new Date();
    return d;
  } catch (e) {
    return new Date();
  }
}
