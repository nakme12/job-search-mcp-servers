/**
 * WhatsApp Reader Script
 * Usage:
 *   node scripts/whatsapp/wa_read_chat.mjs [phone_number_optional]
 */

import WebSocket from 'ws';
import http from 'http';

const phoneArg = process.argv[2] ? process.argv[2].replace(/[^0-9]/g, '') : null;

function getTabs() {
  return new Promise((resolve, reject) => {
    http.get('http://127.0.0.1:9222/json/list', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

function activateTab(tabId) {
  return new Promise((resolve) => {
    http.get('http://127.0.0.1:9222/json/activate/' + tabId, () => resolve());
  });
}

async function main() {
  const tabs = await getTabs();
  const waTab = tabs.find(t => t.url && t.url.includes('web.whatsapp.com'));
  if (!waTab) {
    console.error('❌ WhatsApp Web tab not found in browser');
    process.exit(1);
  }

  await activateTab(waTab.id);
  const ws = new WebSocket(waTab.webSocketDebuggerUrl);

  ws.on('open', async () => {
    if (phoneArg) {
      console.log(`📱 Navigating to WhatsApp chat: +${phoneArg}...`);
      const targetUrl = `https://web.whatsapp.com/send?phone=${phoneArg}`;
      ws.send(JSON.stringify({
        id: 1,
        method: 'Page.navigate',
        params: { url: targetUrl }
      }));
      await new Promise(r => setTimeout(r, 4500));
    }

    // Read full conversation thread
    const expr = `
      (() => {
        const headerEl = document.querySelector('#main header');
        const contactName = headerEl ? headerEl.innerText.split('\\n')[0] : 'Unknown Contact';

        const main = document.querySelector('#main');
        if (!main) return { contact: contactName, text: 'No active chat open' };

        // Get readable text of recent chat
        return {
          contact: contactName,
          text: main.innerText
        };
      })()
    `;

    ws.send(JSON.stringify({
      id: 2,
      method: 'Runtime.evaluate',
      params: { expression: expr, returnByValue: true }
    }));
  });

  ws.on('message', (data) => {
    const msg = JSON.parse(data);
    if (msg.id === 2) {
      const res = msg.result.result.value;
      console.log('\n========================================');
      console.log(`👤 CONTACT: ${res.contact}`);
      console.log('========================================\n');
      console.log(res.text);
      console.log('\n========================================\n');
      ws.close();
      process.exit(0);
    }
  });
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
