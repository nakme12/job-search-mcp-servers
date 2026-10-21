const WebSocket = require('ws');

const ws = new WebSocket('ws://localhost:9222/devtools/page/1FCB69868E3DC4D66333179B09D7B130');

ws.on('open', () => {
  const code = `(() => {
    // Remove the dialog/modal overlay from DOM to see the page underneath cleanly
    const dialog = document.querySelector('[role="dialog"], [class*="modal"]');
    if (dialog) dialog.remove();
    const backdrop = document.querySelector('[class*="backdrop"], [class*="overlay"]');
    if (backdrop) backdrop.remove();
    return {
      title: document.title,
      text: document.body.innerText.replace(/\\n+/g, ' | ')
    };
  })()`;
  ws.send(JSON.stringify({ id: 1, method: 'Runtime.evaluate', params: { expression: code, returnByValue: true } }));
});

ws.on('message', (msg) => {
  console.log('Result:', JSON.parse(msg).result.result.value);
  ws.close();
  process.exit(0);
});
