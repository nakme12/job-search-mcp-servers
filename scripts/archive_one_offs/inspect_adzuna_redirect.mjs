import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const p = await browser.newPage();
  try {
    const applyUrl = 'https://www.adzuna.in/details/5913885939/apply?aztt=eyJhbGciOiJIUzI1NiJ9.eyJpYXQiOjE3OTE4ODI5NTgsImV4cCI6MTc5MjQ4Nzc1OCwidHQiOiJhcGkiLCJjaSI6IjRoWGJzLWJHOFJHM1RaYnJuZFo1Z1EiLCJ0cyI6IjIyZDRiMjQzIn0._FE90Lp_cjIefzLf6bvZPqUOL3EhMDmucGWrLUDofqY&v=384D554E3251D460125BD404DDAC975B63312037&se=';
    console.log('Navigating to apply redirect URL...');
    await p.goto(applyUrl, { waitUntil: 'domcontentloaded', timeout: 25000 });
    await new Promise(r => setTimeout(r, 4000));
    const dest = await p.evaluate(() => {
      return {
        url: window.location.href,
        title: document.title,
        text: document.body.innerText.slice(0, 400)
      };
    });
    console.log('Final landing destination:', dest);
  } finally {
    await p.close();
    await browser.disconnect();
  }
})();
