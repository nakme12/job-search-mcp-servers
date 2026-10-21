const WebSocket = require('ws');

const ws = new WebSocket('ws://localhost:9222/devtools/page/E59FF0002DAA7AB6B089ED53A8D8E863');

ws.on('open', () => {
  const code = `(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Begin verifying'));
    if (btn) {
      btn.click();
      return 'Clicked Begin verifying inside Persona iframe';
    }
    return {
      buttons: Array.from(document.querySelectorAll('button')).map(b => b.innerText),
      text: document.body.innerText.substring(0, 200)
    };
  })()`;
  ws.send(JSON.stringify({ id: 1, method: 'Runtime.evaluate', params: { expression: code, returnByValue: true } }));
});

ws.on('message', (msg) => {
  console.log('Result:', JSON.parse(msg).result.result.value);
  ws.close();
  process.exit(0);
});
