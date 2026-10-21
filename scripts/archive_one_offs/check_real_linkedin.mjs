import puppeteer from 'puppeteer';

async function checkActualLinkedInState() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const liPage = pages.find((p) => p.url().includes('linkedin.com'));

  if (!liPage) {
    console.log('No LinkedIn tab open in browser.');
    browser.disconnect();
    return;
  }

  const state = await liPage.evaluate(() => {
    const isLogin = window.location.href.includes('login') || !!document.querySelector('form.login__form, input#username');
    const isFeed = !!document.querySelector('.feed-shared-update-v2, .share-box-feed-entry__trigger');
    const meBtn = !!document.querySelector('.global-nav__me');
    return {
      currentUrl: window.location.href,
      title: document.title,
      isLoginPage: isLogin,
      isLoggedInFeed: isFeed || meBtn,
      bodyTextSnippet: document.body.innerText.slice(0, 200).replace(/\n/g, ' ')
    };
  });

  console.log('ACTUAL_LINKEDIN_STATUS:', JSON.stringify(state, null, 2));
  browser.disconnect();
}

checkActualLinkedInState().catch(console.error);
