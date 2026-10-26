const http = require('http');
const WebSocket = require('ws');

http.get('http://127.0.0.1:9222/json', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const list = JSON.parse(data);
    const target = list.find(t => t.url && t.url.includes('FMfcgzQhWxZnJDVfnRnNvSFZVvvdWMxM'));
    if (!target) { console.log('Target email tab not found'); return; }
    
    const ws = new WebSocket(target.webSocketDebuggerUrl);
    ws.on('open', () => {
      ws.send(JSON.stringify({
        id: 1,
        method: 'Runtime.evaluate',
        params: {
          expression: 'document.querySelector(".a3s") ? document.querySelector(".a3s").innerText : "no a3s"',
          returnByValue: true
        }
      }));
    });
    ws.on('message', (msg) => {
      const resp = JSON.parse(msg);
      if (resp.id === 1) {
        console.log('--- EMAIL BODY ---');
        console.log(resp.result.result.value);
        ws.send(JSON.stringify({
          id: 2,
          method: 'Runtime.evaluate',
          params: {
            expression: 'Array.from(document.querySelectorAll(".a3s a")).map(a => ({ text: a.innerText.trim(), href: a.href }))',
            returnByValue: true
          }
        }));
      } else if (resp.id === 2) {
        console.log('--- LINKS ---');
        console.log(JSON.stringify(resp.result.result.value, null, 2));
        ws.close();
      }
    });
  });
});
