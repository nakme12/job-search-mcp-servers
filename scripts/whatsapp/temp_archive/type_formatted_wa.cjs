const WebSocket = require('C:/mcp/job-search-mcp-engine/node_modules/ws');
const http = require('http');

// Lines to insert with proper Shift+Enter line breaks so WhatsApp displays each on a new line cleanly
const lines = [
  "Hi Bhavna,",
  "",
  "Thanks for the update! Sharing my details below:",
  "",
  "Full Name: Pratik Patidar",
  "Preferred Profile: React.js / Frontend Developer",
  "Highest Qualification: B.Tech CSE (2024)",
  "Email ID: pratikpatidar7990@gmail.com",
  "Total Experience: 1.5 Years",
  "Current CTC: 2.16 LPA",
  "Current Location: Indore",
  "Preferred Location: Open to Relocate",
  "",
  "Please let me know about the next round.",
  "",
  "Thanks,",
  "Pratik",
  "8269647990"
];

http.get('http://127.0.0.1:9222/json/list', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', async () => {
    const tabs = JSON.parse(data);
    const waTab = tabs.find(t => t.url && t.url.includes('web.whatsapp.com'));
    if (!waTab) {
      console.log('No WhatsApp Web tab found');
      return;
    }
    const ws = new WebSocket(waTab.webSocketDebuggerUrl);
    ws.on('open', async () => {
      // 1. Clear chatbox completely
      ws.send(JSON.stringify({
        id: 1,
        method: 'Runtime.evaluate',
        params: {
          expression: `(() => {
            const el = document.querySelector('footer div[contenteditable="true"]') || document.querySelector('div[contenteditable="true"][data-tab="10"]');
            if (!el) return false;
            el.focus();
            document.execCommand('selectAll', false, null);
            document.execCommand('delete', false, null);
            return true;
          })()`
        }
      }));

      // Wait a bit then type lines with proper CDP Shift+Enter
      setTimeout(async () => {
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          if (line.length > 0) {
            ws.send(JSON.stringify({
              id: 100 + i,
              method: 'Input.insertText',
              params: { text: line }
            }));
          }
          if (i < lines.length - 1) {
            // Shift + Enter for newline without sending
            ws.send(JSON.stringify({
              id: 200 + i,
              method: 'Input.dispatchKeyEvent',
              params: {
                type: 'rawKeyDown',
                windowsVirtualKeyCode: 13,
                key: 'Enter',
                code: 'Enter',
                modifiers: 8 // Shift
              }
            }));
            ws.send(JSON.stringify({
              id: 300 + i,
              method: 'Input.dispatchKeyEvent',
              params: {
                type: 'keyUp',
                windowsVirtualKeyCode: 13,
                key: 'Enter',
                code: 'Enter',
                modifiers: 8
              }
            }));
          }
        }
        setTimeout(() => {
          console.log('Formatted message typed cleanly into WhatsApp input!');
          ws.close();
          process.exit(0);
        }, 500);
      }, 300);
    });
  });
});
