const WebSocket = require('C:/mcp/job-search-mcp-engine/node_modules/ws');
const http = require('http');

setTimeout(() => {
  http.get('http://127.0.0.1:9222/json/list', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      const tabs = JSON.parse(data);
      const waTab = tabs.find(t => t.url && t.url.includes('web.whatsapp.com'));
      if (!waTab) return;
      const ws = new WebSocket(waTab.webSocketDebuggerUrl);
      ws.on('open', () => {
        // Read recent incoming messages from chat window
        const expr = `
          (() => {
            const msgs = Array.from(document.querySelectorAll('div.message-in div.copyable-text')).map(el => el.innerText);
            if (msgs.length > 0) return msgs.slice(-5).join('\\n---\\n');
            const allBubbles = Array.from(document.querySelectorAll('div[data-pre-plain-text]')).map(el => el.innerText);
            return allBubbles.slice(-5).join('\\n---\\n') || 'No messages found yet';
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
          console.log('=== INCOMING RECRUITER MESSAGES ===');
          console.log(resp.result.result.value);
          ws.close();
          process.exit(0);
        }
      });
    });
  });
}, 4000);
