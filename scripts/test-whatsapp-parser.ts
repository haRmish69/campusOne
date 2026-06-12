import { parseWhatsAppExport } from "../lib/whatsappParser";

const fixtureAndroid24h = `
15/02/2026, 14:30 - John Doe: Hey guys, the OS assignment deadline has been extended to Friday 5 PM.
15/02/2026, 14:31 - John Doe: Make sure to submit via the portal.
15/02/2026, 14:35 - Jane Smith: <Media omitted>
15/02/2026, 14:36 - System Message: This message was deleted
15/02/2026, 14:40 - Professor X: Placement drive for Google is next Monday. 
Please bring 2 copies of your resume.
Dress code is formal.
`;

const fixtureIOS12h = `
[2/15/26, 2:30:15 PM] Jane: Hey guys, hostel curfew is extended to 11 PM tonight for the tech fest!
[2/15/26, 2:32:00 PM] Jane: Have fun!
[2/15/26, 2:35:00 PM] System: Messages and calls are end-to-end encrypted.
[2/15/26, 2:40:00 PM] Admin: Hackathon registration closes tomorrow at noon.
Link is in bio.
`;

console.log("=== Testing Android 24h format ===");
const androidResults = parseWhatsAppExport(fixtureAndroid24h);
console.log(`Found ${androidResults.length} valid messages:`);
androidResults.forEach(m => console.log(`- [${m.timestamp?.toISOString()}] ${m.sender}: ${m.message.substring(0, 50)}...`));

console.log("\n=== Testing iOS 12h format ===");
const iosResults = parseWhatsAppExport(fixtureIOS12h);
console.log(`Found ${iosResults.length} valid messages:`);
iosResults.forEach(m => console.log(`- [${m.timestamp?.toISOString()}] ${m.sender}: ${m.message.substring(0, 50)}...`));
