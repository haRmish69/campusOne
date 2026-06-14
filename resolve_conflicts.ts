import * as fs from 'fs';
import * as path from 'path';

function resolveFile(filepath: string) {
  const content = fs.readFileSync(filepath, 'utf-8');
  if (!content.includes('<<<<<<< HEAD')) return;

  const lines = content.split('\n');
  const resolvedLines: string[] = [];
  let inConflict = false;
  let keepHead = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('<<<<<<< HEAD')) {
      inConflict = true;
      keepHead = true; // We are in HEAD section, keep it
      continue;
    }
    if (line.startsWith('=======')) {
      keepHead = false; // We are entering the other branch section, discard it
      continue;
    }
    if (line.startsWith('>>>>>>> ')) {
      inConflict = false;
      continue;
    }

    if (!inConflict || keepHead) {
      resolvedLines.push(line);
    }
  }

  fs.writeFileSync(filepath, resolvedLines.join('\n'), 'utf-8');
  console.log(`Resolved: ${filepath}`);
}

const files = [
  'app/api/briefing/route.ts',
  'app/api/budget/insight/route.ts',
  'app/api/campus/pulse/route.ts',
  'app/api/email/sync/route.ts',
  'app/api/query/route.ts',
  'app/api/sos/route.ts',
  'app/api/suggestions/route.ts',
  'app/api/wellness-sync/route.ts',
  'app/api/wellness/insight/route.ts',
  'app/api/whatsapp/import/route.ts',
  'test_models.ts'
];

files.forEach(f => resolveFile(path.join(process.cwd(), f)));
