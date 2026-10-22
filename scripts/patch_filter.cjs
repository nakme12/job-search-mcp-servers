const fs = require('fs');
const file = 'C:/mcp/job-search-mcp-engine/servers/experience-filter.js';
let content = fs.readFileSync(file, 'utf8');

const oldCode = `export function detectMinYearsExperience(text) {
  if (!text) return null;
  const years = [];
  // "3+ years", "5+ Years of experience", "3+ YOE", "4+ yrs"
  for (const m of text.matchAll(/(\\d+(?:\\.\\d+)?)\\s*\\+\\s*(?:years?|yrs?|yoe)/gi)) years.push(parseFloat(m[1]));
  // "3-6 years", "3 to 6 years", "3–6 years", "Experience Required: 3 + Years"
  for (const m of text.matchAll(/(\\d+(?:\\.\\d+)?)\\s*(?:-|to|–|—)\\s*(\\d+(?:\\.\\d+)?)\\s*\\+?\\s*(?:years?|yrs?|yoe)/gi)) years.push(parseFloat(m[1]));
  // "minimum 3 years", "at least 3 years", "min. 3 years"
  for (const m of text.matchAll(/(?:minimum|at least|min\\.?)\\s*(?:of\\s*)?(\\d+(?:\\.\\d+)?)\\s*\\+?\\s*(?:years?|yrs?|yoe)/gi)) years.push(parseFloat(m[1]));
  return years.length ? Math.min(...years) : null;
}`;

const newCode = `export function detectMinYearsExperience(text) {
  if (!text) return null;
  const years = [];
  // "6yrs-12yrs", "3-6 years", "3 to 6 years"
  for (const m of text.matchAll(/(\\d+(?:\\.\\d+)?)\\s*(?:years?|yrs?|yoe)?\\s*(?:-|to|–|—)\\s*(\\d+(?:\\.\\d+)?)\\s*(?:years?|yrs?|yoe)/gi)) {
    years.push(parseFloat(m[1]));
  }
  // "3+ years", "5+ Years of experience", "3+ YOE", "4+ yrs"
  for (const m of text.matchAll(/(\\d+(?:\\.\\d+)?)\\s*\\+\\s*(?:years?|yrs?|yoe)/gi)) {
    years.push(parseFloat(m[1]));
  }
  // Standalone "6yrs", "5 years", "3 YOE"
  for (const m of text.matchAll(/(\\d+(?:\\.\\d+)?)\\s*(?:years?|yrs?|yoe)\\b/gi)) {
    years.push(parseFloat(m[1]));
  }
  // "minimum 3 years", "at least 3 years", "min. 3 years"
  for (const m of text.matchAll(/(?:minimum|at least|min\\.?)\\s*(?:of\\s*)?(\\d+(?:\\.\\d+)?)\\s*\\+?\\s*(?:years?|yrs?|yoe)/gi)) {
    years.push(parseFloat(m[1]));
  }
  return years.length ? Math.min(...years) : null;
}`;

content = content.replace(/\r\n/g, '\n');
const normOld = oldCode.replace(/\r\n/g, '\n');

if (content.includes(normOld)) {
  content = content.replace(normOld, newCode);
  fs.writeFileSync(file, content.replace(/\n/g, '\r\n'));
  console.log('✅ Successfully enhanced experience-filter.js');
} else {
  console.log('❌ Code block mismatch');
}
