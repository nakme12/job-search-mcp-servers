const WebSocket = require('ws');

const ws = new WebSocket('ws://localhost:9222/devtools/page/2E2FE0F994A7F97EF98281152FE21EC8');

ws.on('open', () => {
  const code = `(() => {
    return {
      title: document.title,
      url: window.location.href,
      bodyText: document.body.innerText.substring(0, 500)
    };
  })()`;
  ws.send(JSON.stringify({ id: 1, method: 'Runtime.evaluate', params: { expression: code, returnByValue: true } }));
});

ws.on('message', (msg) => {
  console.log('Gmail tab info:', JSON.parse(msg).result.result.value);
  ws.close();
  process.exit(0);
});
