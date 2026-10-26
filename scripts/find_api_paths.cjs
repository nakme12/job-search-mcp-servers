const fs = require('fs');
const data = JSON.parse(fs.readFileSync('C:/Users/LENOVO/.gemini/antigravity-cli/brain/8f97f2b0-ceeb-45aa-84f5-66e4618d3634/.system_generated/steps/1496/output.txt', 'utf8'));

for (const s of data.normalized_result.scripts.items) {
  if (s.source && s.source.artifact && s.source.artifact.text) {
    const text = s.source.artifact.text;
    const regex = /["'](\/(?:free|jobs|member|auth|public|api)[a-zA-Z0-9_\-\/]*)["']/g;
    let match;
    const paths = new Set();
    while ((match = regex.exec(text)) !== null) {
      paths.add(match[1]);
    }
    if (paths.size > 0) {
      console.log(`\n=== Paths in ${s.url.split('/').pop()} ===`);
      console.log(Array.from(paths));
    }
  }
}
