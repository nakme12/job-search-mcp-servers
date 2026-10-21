const WebSocket = require('C:/mcp/job-search-mcp-engine/node_modules/ws');
const http = require('http');

// Lines to insert exactly matching ATS Software Solution's requested fields
const lines = [
  "Hi,",
  "",
  "Thanks for reaching out! Sharing my details below:",
  "",
  "Name: Pratik Patidar",
  "Location: Indore (Open to Relocate)",
  "Experienced / Fresher: Experienced (1.5 Years)",
  "Last Degree / Qualification: B.Tech in CSE (2024)",
  "Last CTC: 2.16 LPA",
  "Expected CTC: 4.65 LPA",
  "Position you applied for: React.js / Frontend Developer",
  "Work Mode: Comfortable with WFO (Work From Office)",
  "",
  "Please let me know the next steps.",
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
    if (!waTab) return;
    const ws = new WebSocket(waTab.webSocketDebuggerUrl);
    ws.on('open', async () => {
      // 1. Clear chatbox
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

      // 2. Type cleanly with Shift+Enter line by line
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
          console.log('ATS Software Solution reply typed cleanly into WhatsApp!');
          ws.close();
          process.exit(0);
        }, 500);
      }, 400);
    });
  });
});
