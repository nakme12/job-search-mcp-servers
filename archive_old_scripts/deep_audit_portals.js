import fs from 'fs';
import puppeteer from 'puppeteer-core';

// Connect to existing browser
async function runAudit() {
  const browser = await puppeteer.connect({ browserURL: 'http://localhost:9222' });
  const portals = JSON.parse(fs.readFileSync('scripts/slot4_compliant_portals.json', 'utf8') || '[]');

  console.log(`Starting deep physical audit of ${portals.length} portals...`);
  const verifiedList = [];
  const rejectedList = [];

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  // Audit up to 40 candidate portals for Wave 1
  const targets = portals.slice(0, 40);

  for (let i = 0; i < targets.length; i++) {
    const job = targets[i];
    console.log(`\n[${i + 1}/${targets.length}] Auditing: ${job.company} - ${job.role}`);
    try {
      await page.goto(job.url, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await new Promise(r => setTimeout(r, 2000));

      const auditResult = await page.evaluate(() => {
        const text = document.body.innerText.toLowerCase();

        // Check if expired / closed
        const isClosed = text.includes('no longer accepting applications') ||
                         text.includes('this job is closed') ||
                         text.includes('job expired') ||
                         text.includes('opening has expired');

        // Check for apply button
        const buttons = Array.from(document.querySelectorAll('a, button, input[type="submit"]'));
        const applyBtn = buttons.find(b => {
          const t = (b.innerText || b.value || b.getAttribute('aria-label') || '').toLowerCase().trim();
          return t === 'apply' || t === 'apply now' || t === 'easy apply' || t === 'apply for this job' || t.includes('apply on');
        });

        // Check experience in JD
        let expNotice = 'OK';
        const matches = text.match(/([0-9]+)\s*\+?\s*(?:to|-)\s*([0-9]+)\s*years?/i) || text.match(/([0-9]+)\s*\+?\s*years?\s*(?:of\s*)?experience/i);
        if (matches) {
          const minExp = parseInt(matches[1] || matches[2] || '0', 10);
          if (minExp > 3) expNotice = `Senior: ${minExp}+ YOE`;
        }

        return {
          isClosed,
          hasApplyBtn: !!applyBtn,
          applyBtnText: applyBtn ? (applyBtn.innerText || applyBtn.value || '').trim() : null,
          applyBtnHref: applyBtn ? applyBtn.href : null,
          expNotice
        };
      });

      if (auditResult.isClosed) {
        console.log(`❌ Rejected: Job is closed/expired`);
        rejectedList.push({ ...job, reason: 'Job Closed' });
      } else if (!auditResult.hasApplyBtn) {
        console.log(`⚠️ Warning: No explicit Apply button found on direct page`);
        rejectedList.push({ ...job, reason: 'No Apply Button' });
      } else if (auditResult.expNotice.startsWith('Senior')) {
        console.log(`❌ Rejected: Exceeds candidate YOE (${auditResult.expNotice})`);
        rejectedList.push({ ...job, reason: auditResult.expNotice });
      } else {
        console.log(`✅ VERIFIED: Found "${auditResult.applyBtnText}" | Exp: ${auditResult.expNotice}`);
        verifiedList.push({
          ...job,
          verifiedApplyBtn: auditResult.applyBtnText,
          verifiedApplyHref: auditResult.applyBtnHref || job.url,
          expStatus: auditResult.expNotice
        });
      }
    } catch (err) {
      console.log(`⚠️ Audit timeout/error for ${job.company}: ${err.message}`);
      rejectedList.push({ ...job, reason: `Error: ${err.message}` });
    }
  }

  await page.close();

  fs.writeFileSync('scripts/slot4_deep_verified_portals.json', JSON.stringify(verifiedList, null, 2));
  fs.writeFileSync('scripts/slot4_audit_rejected.json', JSON.stringify(rejectedList, null, 2));

  console.log(`\n==============================================`);
  console.log(`AUDIT COMPLETE:`);
  console.log(`Total Verified Ready to Apply: ${verifiedList.length}`);
  console.log(`Total Rejected / Expired: ${rejectedList.length}`);
  console.log(`Saved to scripts/slot4_deep_verified_portals.json`);
  console.log(`==============================================`);
  process.exit(0);
}

runAudit().catch(err => {
  console.error('Fatal audit runner error:', err);
  process.exit(1);
});
