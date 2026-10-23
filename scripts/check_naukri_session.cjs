const playwright = require('C:/mcp/naukri-auto-apply-engine/node_modules/playwright');

async function checkNaukriSession() {
  const browser = await playwright.chromium.connectOverCDP('http://127.0.0.1:9222');
  const context = browser.contexts()[0];
  const naukriPage = context.pages().find(p => p.url().includes('naukri.com'));
  if (naukriPage) {
    const sessionInfo = await naukriPage.evaluate(() => {
      const userEl = document.querySelector('.nI-gNb-drawer__user-name, a[href*="mynaukri"], .nI-gNb-header__user');
      const loginBtn = document.querySelector('a#login_Layer, a[href*="login"]');
      return {
        isLoggedIn: !!userEl,
        userName: userEl ? userEl.innerText.trim() : null,
        hasLoginBtn: !!loginBtn
      };
    });
    console.log('Naukri Session in Brave:', JSON.stringify(sessionInfo, null, 2));
  }
}

checkNaukriSession().catch(console.error);
