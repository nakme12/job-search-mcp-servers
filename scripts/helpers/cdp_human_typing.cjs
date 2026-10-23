/**
 * ASHBY & ATS PORTAL CDP HUMAN TYPING HELPER
 * 
 * CORE LEARNING:
 * Direct DOM assignment (.value = ...) does NOT trigger React Fiber state,
 * nor does it generate browser trusted events (isTrusted: true).
 * 
 * SOLUTION:
 * 1. Physical CDP Click: element.click({ clickCount: 3 }) to select/focus.
 * 2. Clear field: page.keyboard.press('Backspace').
 * 3. Physical CDP Typing: page.keyboard.type(text, { delay: 15-25ms }).
 * 4. Synthetic Blur & Change dispatch as secondary safety.
 */

async function fillFieldCDP(page, element, text) {
  if (!element || !text) return;
  try {
    await element.scrollIntoViewIfNeeded();
    await element.click({ clickCount: 3 });
    await page.keyboard.press('Backspace');
    await page.keyboard.type(String(text), { delay: 15 });
    await page.keyboard.press('Tab');
  } catch (err) {
    console.error('Error filling field via CDP:', err.message);
  }
}

module.exports = { fillFieldCDP };
