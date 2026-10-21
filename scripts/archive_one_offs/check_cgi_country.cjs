const WebSocket = require('ws');
const http = require('http');

http.get('http://localhost:9222/json', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', async () => {
    const tabs = JSON.parse(data);
    const cgiTab = tabs.find(t => t.title.includes('CGI'));
    const ws = new WebSocket(cgiTab.webSocketDebuggerUrl);
    ws.on('open', () => {
      ws.send(JSON.stringify({
        id: 1,
        method: 'Runtime.evaluate',
        params: {
          expression: `
            (() => {
              const sel = document.getElementById('Inp_CGI_Cand_Seek_Employment_Country');
              if (!sel) return 'No select found';
              return Array.from(sel.options).filter(o => o.text.toLowerCase().includes('india')).map(o => ({ text: o.text, value: o.value }));
            })()
          `,
          returnByValue: true
        }
      }));
    });
    ws.on('message', (msg) => {
      const resp = JSON.parse(msg);
      if (resp.id === 1) {
        console.log('Country options:', resp.result.result.value);
        ws.close();
      }
    });
  });
});
