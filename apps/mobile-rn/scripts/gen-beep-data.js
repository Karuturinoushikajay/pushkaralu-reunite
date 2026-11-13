const fs = require('fs');
const path = require('path');
const b64 = fs.readFileSync(path.join(__dirname, '../src/alerts/beep.b64.txt'), 'utf8').trim();
const src =
  '/** Auto-generated alert beep (WAV data URI). */\n' +
  'export const ALERT_BEEP_DATA_URI =\n' +
  "  'data:audio/wav;base64," +
  b64 +
  "';\n";
fs.writeFileSync(path.join(__dirname, '../src/alerts/beepData.ts'), src);
console.log('wrote beepData.ts bytes', src.length);
