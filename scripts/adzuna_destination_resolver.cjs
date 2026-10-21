/**
 * PRODUCTION-GRADE ADZUNA DESTINATION RESOLVER
 * Built strictly according to:
 * - Rule 81 (Zero User Tab Touch / Isolated newPage creation)
 * - Point 1.1 (Stage 1 banner dismissal + Stage 2 'No thanks, take me to the job' click)
 * - Point 1.2 (Outside backdrop click for exit-intent popups like Cutshort)
 * - Point 2.1 (Mandatory 'Read more' / 'Show more' click expansion)
 * - Point 2.2 (Physical Form-Presence Assertion)
 */

const puppeteer = require('puppeteer-core');

async function resolveAdzunaJob(adzunaUrl) {
  console.log(`\n======================================================`);
  console.log(`🔍 RESOLVING ADZUNA URL: ${adzunaUrl}`);
  console.log(`======================================================`);

  let browser;
  let testPage;

  try {
    browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });

    // RULE 81 COMPLIANCE: NEVER touch or close existing user tabs!
    // Open a fresh isolated page specifically for this resolution
    testPage = await browser.newPage();
    console.log(`[Rule 81] Created isolated worker tab (Target ID: ${testPage.target()._targetId})`);

    // Step 1: Navigate to Adzuna job URL
    console.log(`[1] Navigating to Adzuna page...`);
    await testPage.goto(adzunaUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 3000));

    // Step 2: Stage 1 Email Alert banner dismissal
    console.log(`[2] Checking Stage 1 Email Banner...`);
    const stage1Dismissed = await testPage.evaluate(() => {
      const candidates = Array.from(document.querySelectorAll('button, a, span, div'));
      const target = candidates.find(el => el.innerText && (el.innerText.trim() === 'No, thanks' || el.innerText.trim() === 'No thanks'));
      if (target) {
        target.click();
        return true;
      }
      return false;
    });
    console.log(`  -> Stage 1 ("No, thanks") dismissed: ${stage1Dismissed}`);

    // Step 3: Trigger "Apply for this job" link
    console.log(`[3] Triggering "Apply for this job"...`);
    const triggered = await testPage.evaluate(() => {
      const link = document.querySelector('a[href*="/land/ad/"]');
      if (link) {
        link.click();
        return link.href;
      }
      return null;
    });
    console.log(`  -> Clicked Apply Link: ${triggered}`);
    await new Promise(r => setTimeout(r, 2000));

    // Step 4: Stage 2 Interstitial Modal ("No thanks, take me to the job")
    console.log(`[4] Clicking Stage 2 Modal ("No thanks, take me to the job")...`);
    let stage2Handled = false;
    for (let i = 0; i < 4; i++) {
      stage2Handled = await testPage.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a, button'));
        const target = links.find(el => el.innerText && el.innerText.trim().toLowerCase().includes('take me to the job'));
        if (target) {
          target.click();
          return true;
        }
        return false;
      });
      if (stage2Handled) break;
      await new Promise(r => setTimeout(r, 1000));
    }
    console.log(`  -> Stage 2 ("No thanks, take me to the job") handled: ${stage2Handled}`);

    // Step 5: Wait for destination redirect to complete
    console.log(`[5] Waiting for external destination redirect...`);
    await testPage.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
    await new Promise(r => setTimeout(r, 4000));

    const destinationUrl = testPage.url();
    const destinationTitle = await testPage.title();
    console.log(`  -> Destination Landed: ${destinationUrl}`);
    console.log(`  -> Destination Title: ${destinationTitle}`);

    // Step 6: Point 1.2 - Handle Exit-Intent / Feedback Popups (e.g. Cutshort) via Outside Backdrop Click
    console.log(`[6] Handling any backdrop modals / exit popups via outside clicks & Escape...`);
    await testPage.mouse.click(15, 15);
    await new Promise(r => setTimeout(r, 200));
    await testPage.mouse.click(15, 15);
    await testPage.keyboard.press('Escape');
    await new Promise(r => setTimeout(r, 1000));

    // Step 7: Point 2.1 - Expand "Read more" / "Show more" to reveal full JD
    console.log(`[7] Expanding collapsed "Read more" / "Show more" content...`);
    const readMoreClicked = await testPage.evaluate(() => {
      const candidates = Array.from(document.querySelectorAll('button, a, span'));
      const readMoreBtn = candidates.find(el => {
        const txt = el.innerText ? el.innerText.trim().toLowerCase() : '';
        return (txt === 'read more' || txt === 'show more' || txt === 'see more' || txt === 'view full description');
      });
      if (readMoreBtn) {
        readMoreBtn.click();
        return true;
      }
      return false;
    });
    console.log(`  -> "Read more" expanded: ${readMoreClicked}`);
    await new Promise(r => setTimeout(r, 1500));

    // Step 8: Point 2.2 - Deep Audit & Physical Form Assertion
    console.log(`[8] Running Deep DOM Audit & Physical Form Assertion...`);
    const auditResult = await testPage.evaluate(() => {
      const fullText = document.body ? document.body.innerText : '';
      
      // YOE Extraction
      const yoe3PlusRegex = /(3\s*[\+\-]\s*[45678]|3\s*to\s*[45678]|3\s*years|4\s*years|5\s*years|Senior|Lead|Principal|Architect)/i;
      const isOverExperience = yoe3PlusRegex.test(fullText);

      // Physical Form Footprint
      const formsCount = document.querySelectorAll('form').length;
      const fileInputsCount = document.querySelectorAll('input[type="file"]').length;
      const emailInputsCount = document.querySelectorAll('input[type="email"], input[name*="email"], input[id*="email"]').length;
      const hasApplyBtn = Array.from(document.querySelectorAll('button, a')).some(el => {
        const t = el.innerText ? el.innerText.trim().toLowerCase() : '';
        return (t.includes('apply for') || t.includes('apply now') || t.includes('apply to this job') || t === 'apply');
      });
      const hasIframeAts = Array.from(document.querySelectorAll('iframe')).some(f => (f.src && (f.src.includes('greenhouse') || f.src.includes('lever') || f.src.includes('ashby') || f.src.includes('kula'))));

      const hasPhysicalForm = fileInputsCount > 0 || formsCount > 0 || hasApplyBtn || hasIframeAts;

      return {
        isOverExperience,
        hasPhysicalForm,
        fileInputsCount,
        formsCount,
        hasApplyBtn,
        hasIframeAts,
        textSnippet: fullText.substring(0, 400).replace(/\s+/g, ' ')
      };
    });

    console.log(`\n📊 AUDIT VERDICT:`);
    console.log(`  - 3+ YOE / Senior Detected: ${auditResult.isOverExperience}`);
    console.log(`  - Physical Form / Apply Available: ${auditResult.hasPhysicalForm}`);
    console.log(`  - Details: forms=${auditResult.formsCount}, files=${auditResult.fileInputsCount}, applyBtn=${auditResult.hasApplyBtn}`);

    let finalStatus = 'QUALIFIED';
    if (auditResult.isOverExperience) finalStatus = 'SKIPPED_OUT_OF_RANGE_YOE';
    else if (!auditResult.hasPhysicalForm) finalStatus = 'SKIPPED_NO_PHYSICAL_FORM';

    console.log(`  🏆 FINAL STATUS: ${finalStatus}`);
    console.log(`======================================================\n`);

    return {
      destinationUrl,
      destinationTitle,
      finalStatus,
      auditResult
    };

  } catch (err) {
    console.error(`❌ Error resolving Adzuna job:`, err.message);
    return { error: err.message };
  } finally {
    // RULE 81 COMPLIANCE: Close ONLY the tab we opened, NEVER touch user tabs
    if (testPage) {
      console.log(`[Rule 81] Cleanly closing ONLY worker tab. User tabs left 100% untouched.`);
      await testPage.close().catch(() => {});
    }
    if (browser) browser.disconnect();
  }
}

// Test with Job 2 if run directly
if (require.main === module) {
  const testUrl = process.argv[2] || 'https://www.adzuna.in/details/5920569700?utm_medium=api&utm_source=22d4b243';
  resolveAdzunaJob(testUrl).then(res => {
    console.log('Result Summary:', res);
  });
}

module.exports = { resolveAdzunaJob };
