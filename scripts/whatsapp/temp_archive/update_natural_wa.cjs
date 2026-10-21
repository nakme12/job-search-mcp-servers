const WebSocket = require('C:/mcp/job-search-mcp-engine/node_modules/ws');
const http = require('http');

// Ekdum clean, natural human format - jaise dev khud WhatsApp par details bhejta hai
const naturalText = `Hi Bhavna,

Thanks for the update! Sharing my details as requested:

Full Name: Pratik Patidar
Preferred Profile: React.js / Frontend Developer
Highest Qualification: B.Tech CSE (2024)
Email ID: pratikpatidar7990@gmail.com
Total Experience: 1.5 Years
Current CTC: 2.16 LPA
Current Location: Indore
Preferred Location: Open to Relocate

Please let me know about the next round.

Thanks,
Pratik
8269647990`;

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
      const expr = `
        (() => {
          const chatBox = document.querySelector('footer div[contenteditable="true"]') || document.querySelector('div[contenteditable="true"][data-tab="10"]');
          if (!chatBox) {
            return { success: false, reason: 'Chat box not found' };
          }
          chatBox.focus();
          document.execCommand('selectAll', false, null);
          document.execCommand('delete', false, null);
          document.execCommand('insertText', false, ${JSON.stringify(naturalText)});
          return { success: true };
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
        console.log('Re-draft result:', JSON.stringify(resp.result.result.value));
        ws.close();
        process.exit(0);
      }
    });
  });
});
