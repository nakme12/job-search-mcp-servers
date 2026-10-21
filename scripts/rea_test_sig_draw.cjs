const puppeteer = require('puppeteer-core');

(async () => {
  try {
    const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
    const pages = await browser.pages();
    const page = pages.find(p => p.url().startsWith('https://79371.aidaform.com/atlantis'));

    // Test drawing on canvas
    const sigResult = await page.evaluate(async () => {
      const canvas = document.querySelector('canvas');
      if (!canvas) return 'No canvas found';
      
      const ctx = canvas.getContext('2d');
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#000000';
      ctx.beginPath();
      ctx.moveTo(50, 70);
      ctx.lineTo(80, 40);
      ctx.lineTo(110, 80);
      ctx.lineTo(140, 50);
      ctx.lineTo(170, 70);
      ctx.stroke();

      // Trigger change or custom events if signature pad expects it
      canvas.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientX: 50, clientY: 70 }));
      canvas.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: 100, clientY: 50 }));
      canvas.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, clientX: 170, clientY: 70 }));

      return 'Drawn on canvas';
    });

    console.log(sigResult);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
