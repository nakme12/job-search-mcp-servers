const WebSocket = require('ws');

const ws = new WebSocket('ws://localhost:9222/devtools/page/9F9016A36E57A6A9C58587FD8906B212');

ws.on('open', () => {
  const code = `(() => {
    const saveBtn = document.getElementById('btnSave');
    if (!saveBtn) return { error: 'btnSave not found' };
    saveBtn.click();
    return { clicked: true };
  })()`;
  ws.send(JSON.stringify({ id: 1, method: 'Runtime.evaluate', params: { expression: code, returnByValue: true } }));
});

ws.on('message', (msg) => {
  console.log('Save result:', JSON.parse(msg).result.result.value);
  ws.close();
  process.exit(0);
});
