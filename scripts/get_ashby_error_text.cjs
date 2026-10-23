const WebSocket = require('C:/mcp/rea/node_modules/ws');

const ws = new WebSocket('ws://127.0.0.1:9222/devtools/page/86641AE1A78B8C75E4203E4C24B52B9E');
ws.on('open', () => {
  ws.send(JSON.stringify({
    id: 1,
    method: 'Runtime.evaluate',
    params: {
      expression: `
      (() => {
        const text = document.body ? document.body.innerText : '';
        const parts = text.split('Your form needs corrections');
        if (parts.length > 1) {
          return parts[1].slice(0, 500).trim();
        }
        return 'No error banner found';
      })()
      `,
      returnByValue: true
    }
  }));
});

ws.on('message', (d) => {
  const m = JSON.parse(d);
  if (m.id === 1) {
    console.log('EXACT ASHBY ERROR BANNER CONTENT:\n', m.result.result.value);
    ws.close();
    process.exit(0);
  }
});
