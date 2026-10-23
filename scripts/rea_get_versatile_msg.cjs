const WebSocket = require('C:/mcp/rea/node_modules/ws');

const ws = new WebSocket('ws://127.0.0.1:9222/devtools/page/1730E7BDF9C5F67FC62CDDEBC1D6F812');
ws.on('open', () => {
  ws.send(JSON.stringify({
    id: 1,
    method: 'Runtime.evaluate',
    params: {
      expression: `
      (() => {
        const msgs = Array.from(document.querySelectorAll('*')).filter(el => {
          const t = el.innerText ? el.innerText.trim() : '';
          return t.includes('Thank you') || t.includes('successfully') || t.includes('received') || t.includes('error');
        }).map(el => el.innerText.trim());
        return msgs.slice(0, 5);
      })()
      `,
      returnByValue: true
    }
  }));
});

ws.on('message', d => {
  const m = JSON.parse(d);
  if (m.id === 1) {
    console.log('Versatile Detected Messages:\n', m.result.result.value);
    ws.close();
    process.exit(0);
  }
});
