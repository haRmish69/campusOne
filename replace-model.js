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
  'lib/gemini.ts',
  'fix-model.js'
];
files.forEach(f => {
  try {
    let content = fs.readFileSync(f, 'utf8');
    if (content.includes('gemini-1.5-flash')) {
      fs.writeFileSync(f, content.replace(/gemini-1.5-flash/g, 'gemini-2.5-flash'));
      console.log('Fixed', f);
    }
  } catch (err) {
    console.error('Error reading/writing file', f, err.message);
  }
});
