const WebSocket = require('ws');

const ws = new WebSocket('ws://localhost:9222/devtools/page/1FCB69868E3DC4D66333179B09D7B130');

ws.on('open', () => {
  const code = `(() => {
    const btns = Array.from(document.querySelectorAll('button')).map(b => ({
      text: b.innerText,
      class: b.className
    }));
    // Check main content behind modal
    const mainEl = document.querySelector('main') || document.body;
    return {
      btns,
      pageText: mainEl.innerText.replace(/\\n+/g, ' | ')
    };
  })()`;
  ws.send(JSON.stringify({ id: 1, method: 'Runtime.evaluate', params: { expression: code, returnByValue: true } }));
});

ws.on('message', (msg) => {
  console.log('Modal status:', JSON.parse(msg).result.result.value);
  ws.close();
  process.exit(0);
});
