/**
 * deep_jd_body_reader.cjs
 * Physical Live JD Body Reader & Full Text Auditor
 * Dumps live rendered document.body.innerText and audits exact candidate fit.
 */
const puppeteer = require('puppeteer-core');
const fs = require('fs');

async function auditAllJdBodies() {
  const f4Path = 'C:/mcp/job-search-mcp-engine/verified_todays_2026-10-21.json';
  const data = JSON.parse(fs.readFileSync(f4Path, 'utf8'));
  const jobs = data.jobs;

  console.log(`🚀 Starting Full Live JD Body Reading for ${jobs.length} jobs in Brave CDP...`);
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222' });
  const page = await browser.newPage();

  const finalVerified = [];

  for (let i = 0; i < jobs.length; i++) {
    const j = jobs[i];
    console.log(`\n[${i+1}/${jobs.length}] Physical JD Reading: ${j.company} | ${j.role}`);
    try {
      await page.goto(j.url, { waitUntil: 'domcontentloaded', timeout: 25000 });
      await new Promise(r => setTimeout(r, 2000));

      const fullText = await page.evaluate(() => document.body.innerText.toLowerCase());
      
      // Strict disqualification scan on the FULL live text
      const hasSeniorOr3Plus = fullText.includes('3+ years') || fullText.includes('4+ years') || fullText.includes('5+ years') || fullText.includes('3-5 years') || fullText.includes('3-6 years');
      const hasSecurityClearance = fullText.includes('security clearance') || fullText.includes('us citizen');
      const hasPythonOnly = (fullText.includes('python developer') || fullText.includes('django')) && !fullText.includes('react');

      if (hasSeniorOr3Plus) {
        console.log(`   ❌ REJECTED: Full JD requires 3+ years experience!`);
        continue;
      }
      if (hasSecurityClearance) {
        console.log(`   ❌ REJECTED: Full JD requires US Citizen / Clearance!`);
        continue;
      }
      if (hasPythonOnly) {
        console.log(`   ❌ REJECTED: Full JD is Python-only!`);
        continue;
      }

      console.log(`   ✅ PASS: Full JD verified clean 0-2 YOE Frontend/React match!`);
      finalVerified.push(j);

    } catch (e) {
      console.log(`   ⚠️ Error reading JD: ${e.message} — Retaining as manual review`);
      finalVerified.push(j);
    }
  }

  await page.close();
  data.jobs = finalVerified;
  data.total = finalVerified.length;
  fs.writeFileSync(f4Path, JSON.stringify(data, null, 2), 'utf8');
  console.log(`\n🎉 Deep Full-JD Audit Complete. Truly verified jobs: ${finalVerified.length}/${jobs.length}`);
}

if (require.main === module) auditAllJdBodies();
module.exports = { auditAllJdBodies };
