/**
 * LINKEDIN STRICT HUMAN-TYPE EMULATION & BOT-FLAG PROTECTION UTILITY (RULE 86)
 * 
 * Enforces:
 * - Natural randomized jitter delays
 * - Realistic human keystroke typing
 * - Smooth step-by-step scrolling
 * - Strict max 2 tabs ceiling
 */

const sleep = ms => new Promise(r => setTimeout(r, ms));

/**
 * Random delay between min and max milliseconds
 */
async function humanDelay(minMs = 3000, maxMs = 6000) {
  const delay = Math.floor(minMs + Math.random() * (maxMs - minMs));
  await sleep(delay);
}

/**
 * Human-like keystroke typing with natural variance
 */
async function humanType(page, target, text) {
  if (typeof target === 'string') {
    await page.waitForSelector(target, { timeout: 10000 });
    await page.focus(target);
  } else if (target && target.focus) {
    await target.focus();
  }

  for (const char of text) {
    await page.keyboard.type(char);
    // 40ms to 90ms jitter per character
    const charDelay = Math.floor(40 + Math.random() * 50);
    await sleep(charDelay);
  }
  await sleep(300 + Math.random() * 400);
}

/**
 * Smooth natural scrolling simulating mouse wheel / touch scroll
 */
async function humanScroll(page, steps = 3, distancePerStep = 250) {
  for (let i = 0; i < steps; i++) {
    await page.evaluate((dist) => {
      window.scrollBy({
        top: dist,
        left: 0,
        behavior: 'smooth'
      });
    }, distancePerStep);
    // Pause between scrolls like a human reading
    await sleep(800 + Math.random() * 1200);
  }
}

/**
 * Enforces Rule 61 / Rule 86: Maximum 2 LinkedIn tabs open at any time
 */
async function assertLinkedInTabsCeiling(browser) {
  const pages = await browser.pages();
  const liPages = pages.filter(p => p.url().includes('linkedin.com'));
  if (liPages.length > 2) {
    console.warn(`[Rule 86 Guard] Detected ${liPages.length} LinkedIn tabs! Pruning excess tabs...`);
    // Close the latest ones exceeding 2
    for (let i = 2; i < liPages.length; i++) {
      try {
        await liPages[i].close();
      } catch (e) {}
    }
  }
}

module.exports = {
  humanDelay,
  humanType,
  humanScroll,
  assertLinkedInTabsCeiling
};
