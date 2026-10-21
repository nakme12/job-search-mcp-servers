const WebSocket = require('C:/mcp/job-search-mcp-engine/node_modules/ws');
const http = require('http');

http.get('http://127.0.0.1:9222/json/list', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const tabs = JSON.parse(data);
    const waTab = tabs.find(t => t.url && t.url.includes('web.whatsapp.com'));
    if (!waTab) {
      console.log('No WhatsApp Web tab found');
      return;
    }
    const ws = new WebSocket(waTab.webSocketDebuggerUrl);
    ws.on('open', () => {
      // Find the send button in the attachment/media preview panel and click it
      const expr = `
        (() => {
          // Send button in media preview overlay (usually has data-icon="send" inside a button)
          const sendIcon = document.querySelector('span[data-icon="send"]');
          if (sendIcon) {
            const btn = sendIcon.closest('button, div[role="button"]');
            if (btn) {
              btn.click();
              return 'Clicked send button via span[data-icon="send"]';
            }
          }
          // Fallback: any send button inside media editor footer
          const previewSend = document.querySelector('div[aria-label="Send"], span[data-icon="wds-ic-send-filled"]');
          if (previewSend) {
            previewSend.closest('button, div[role="button"]').click();
            return 'Clicked send via aria-label';
          }
          return 'Send button not found';
        })()
      `;
      ws.send(JSON.stringify({
        id: 1,
        method: 'Runtime.evaluate',
        params: { expression: expr, returnByValue: true }
      }));
    });
    ws.on('message', (msg) => {
      const resp = JSON.parse(msg);
      if (resp.id === 1) {
        console.log('Send PDF result:', JSON.stringify(resp.result.result.value));
        ws.close();
        process.exit(0);
      }
    });
  });
});
