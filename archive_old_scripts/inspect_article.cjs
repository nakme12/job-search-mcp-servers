const WebSocket = require('ws');

const ws = new WebSocket('ws://localhost:9222/devtools/page/9F9016A36E57A6A9C58587FD8906B212');

ws.on('open', () => {
  const code = `(() => {
    const el = document.getElementById('Line10ClaimArticleandParagraph');
    return {
      exists: !!el,
      disabled: el ? el.disabled : null,
      readOnly: el ? el.readOnly : null,
      outerHTML: el ? el.outerHTML : null,
      style: el ? el.style.cssText : null,
      classList: el ? Array.from(el.classList) : null
    };
  })()`;
  ws.send(JSON.stringify({ id: 1, method: 'Runtime.evaluate', params: { expression: code, returnByValue: true } }));
});

ws.on('message', (msg) => {
  console.log(JSON.parse(msg).result.result.value);
  ws.close();
  process.exit(0);
});
