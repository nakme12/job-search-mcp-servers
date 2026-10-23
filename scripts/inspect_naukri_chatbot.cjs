const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

async function testChatbotDOM() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const page = await browser.newPage();
  const url = 'https://www.naukri.com/job-listings-react-mean-mern-node-js-developers-freshers-chennai-tvm-infotech-chennai-0-to-1-years-161026019268';
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 35000 });

  await page.evaluate(() => {
    const b = document.getElementById('apply-button');
    if (b) b.click();
  });

  await new Promise(r => setTimeout(r, 4000));

  const info = await page.evaluate(() => {
    // Search for chatbot elements
    const elements = Array.from(document.querySelectorAll('*')).filter(el => {
      const cls = typeof el.className === 'string' ? el.className.toLowerCase() : '';
      const id = typeof el.id === 'string' ? el.id.toLowerCase() : '';
      return cls.includes('chatbot') || cls.includes('bot-container') || id.includes('chatbot');
    });

    const buttons = Array.from(document.querySelectorAll('button, div[role="button"], span.btn, div.chatbot-option')).map(b => ({
      text: b.innerText.trim(),
      tag: b.tagName,
      cls: b.className
    })).filter(b => b.text.length > 0 && b.text.length < 50);

    const inputs = Array.from(document.querySelectorAll('input, textarea')).map(i => ({
      id: i.id,
      name: i.name,
      type: i.type,
      placeholder: i.placeholder,
      visible: i.offsetParent !== null
    }));

    return {
      matchCount: elements.length,
      buttonsSample: buttons.slice(0, 15),
      visibleInputs: inputs.filter(i => i.visible)
    };
  });

  console.log('Chatbot DOM analysis:', JSON.stringify(info, null, 2));

  const proofDir = path.resolve('C:/mcp/job-search-mcp-engine/screenshots/2026-10-23/shift1');
  fs.mkdirSync(proofDir, { recursive: true });
  const shotPath = path.join(proofDir, 'naukri_chatbot_live.png');
  await page.screenshot({ path: shotPath });
  console.log('Chatbot screenshot saved:', shotPath);

  await page.close();
  await browser.disconnect();
}

testChatbotDOM().catch(console.error);
