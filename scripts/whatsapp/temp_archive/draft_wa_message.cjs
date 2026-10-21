const WebSocket = require('C:/mcp/job-search-mcp-engine/node_modules/ws');
const http = require('http');

const messageText = `Hi Bhavna,

Thank you for shortlisting my profile. Here are the requested details:

Full Name - Pratik Patidar
Preferred Profile - Frontend / React.js Developer
Highest Qualification - B.Tech in CSE (BUIT Bhopal, 2024, 7.89 CGPA)
Email Id - pratikpatidar7990@gmail.com
Total Experience - 1.5 Years (React.js, Next.js, TypeScript, REST APIs)
Last / Current Salary - 2.16 LPA
Current Location - Indore, Madhya Pradesh
Preferred Location - Open to Relocate

Looking forward to the next steps!

Thanks & Regards,
Pratik Patidar
+91 82696 47990`;

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
      // Find chat box and insert text via execCommand to simulate clean typing
      const expr = `
        (() => {
          const chatBox = document.querySelector('footer div[contenteditable="true"]') || document.querySelector('div[contenteditable="true"][data-tab="10"]');
          if (!chatBox) {
            return { success: false, reason: 'Chat box not loaded yet' };
          }
          chatBox.focus();
          document.execCommand('insertText', false, ${JSON.stringify(messageText)});
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
        console.log('Insert text result:', JSON.stringify(resp.result.result.value));
        ws.close();
        process.exit(0);
      }
    });
  });
});
