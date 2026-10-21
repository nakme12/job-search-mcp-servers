const WebSocket = require('ws');

const ws = new WebSocket('ws://localhost:9222/devtools/page/1FCB69868E3DC4D66333179B09D7B130');

ws.on('open', () => {
  const code = `(() => {
    return Array.from(document.querySelectorAll('input, select, [contenteditable="true"]')).map(e => ({
      id: e.id,
      name: e.name,
      type: e.type,
      placeholder: e.placeholder,
      val: e.value,
      ariaLabel: e.getAttribute('aria-label'),
      outerHTML: e.outerHTML.substring(0, 150)
    }));
  })()`;
  ws.send(JSON.stringify({ id: 1, method: 'Runtime.evaluate', params: { expression: code, returnByValue: true } }));
});

ws.on('message', (msg) => {
  console.log(JSON.stringify(JSON.parse(msg).result.result.value, null, 2));
  ws.close();
  process.exit(0);
});
