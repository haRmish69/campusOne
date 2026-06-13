const fs = require('fs');
const files = [
  'app/api/wellness/insight/route.ts',
  'app/api/wellness-sync/route.ts',
  'app/api/campus/pulse/route.ts',
  'app/api/briefing/route.ts',
  'app/api/suggestions/route.ts',
  'app/api/query/route.ts',
  'app/api/sos/route.ts',
  'app/api/email/sync/route.ts',
  'app/api/whatsapp/import/route.ts',
  'app/api/budget/insight/route.ts',
  'lib/gemini.ts'
];
files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  if (content.includes('gemini-flash-latest')) {
    fs.writeFileSync(f, content.replace(/gemini-flash-latest/g, 'gemini-2.0-flash'));
    console.log('Fixed', f);
  }
});
