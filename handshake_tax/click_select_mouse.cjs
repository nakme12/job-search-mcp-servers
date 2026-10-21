const WebSocket = require('ws');

const ws = new WebSocket('ws://localhost:9222/devtools/page/E59FF0002DAA7AB6B089ED53A8D8E863');

ws.on('open', () => {
  const code = `(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.trim() === 'Select');
    if (btn) {
      const rect = btn.getBoundingClientRect();
      return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
    }
    return null;
  })()`;
  ws.send(JSON.stringify({ id: 1, method: 'Runtime.evaluate', params: { expression: code, returnByValue: true } }));
});

ws.on('message', (msg) => {
  const data = JSON.parse(msg);
  if (data.id === 1) {
    const coords = data.result.result.value;
    console.log('Coords:', coords);
    if (coords) {
      ws.send(JSON.stringify({ id: 2, method: 'Input.dispatchMouseEvent', params: { type: 'mousePressed', x: coords.x, y: coords.y, button: 'left', clickCount: 1 } }));
      setTimeout(() => {
        ws.send(JSON.stringify({ id: 3, method: 'Input.dispatchMouseEvent', params: { type: 'mouseReleased', x: coords.x, y: coords.y, button: 'left', clickCount: 1 } }));
        setTimeout(() => {
          ws.close();
          process.exit(0);
        }, 500);
      }, 100);
    } else {
      ws.close();
      process.exit(1);
    }
  }
});
