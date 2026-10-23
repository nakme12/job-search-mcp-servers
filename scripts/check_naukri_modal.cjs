const playwright = require('C:/mcp/naukri-auto-apply-engine/node_modules/playwright');

async function checkNaukriModal() {
  const browser = await playwright.chromium.connectOverCDP('http://127.0.0.1:9222');
  const context = browser.contexts()[0];
  const naukriPage = context.pages().find(p => p.url().includes('naukri.com/job-listings'));
  if (naukriPage) {
    const dialogs = await naukriPage.evaluate(() => {
      const modals = Array.from(document.querySelectorAll('.modal, .drawer, .apply-message, .chatbot, .apply-dialog'))
        .map(m => m.innerText.substring(0, 200).replace(/\s+/g, ' '));
      const buttons = Array.from(document.querySelectorAll('button, a'))
        .map(b => b.innerText.trim())
        .filter(t => t.length > 0 && t.length < 40)
        .slice(0, 15);
      return { modals, buttons };
    });
    console.log('Naukri Dialog State:', JSON.stringify(dialogs, null, 2));
  }
}

checkNaukriModal().catch(console.error);
