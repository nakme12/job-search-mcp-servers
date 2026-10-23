const WebSocket = require('C:/mcp/rea/node_modules/ws');

const ws = new WebSocket('ws://127.0.0.1:9222/devtools/page/86641AE1A78B8C75E4203E4C24B52B9E');
let id = 1;
function send(m, p = {}) {
  return new Promise(r => {
    const cur = id++;
    const h = d => {
      const msg = JSON.parse(d);
      if (msg.id === cur) { ws.off('message', h); r(msg.result); }
    };
    ws.on('message', h);
    ws.send(JSON.stringify({ id: cur, method: m, params: p }));
  });
}

ws.on('open', async () => {
  await send('Runtime.enable');
  const details = await send('Runtime.evaluate', {
    expression: `
    (() => {
      const parent = document.querySelector('label[for="955d2f14-8d6a-484a-852d-683cdcbf7a5d"]')?.closest('div');
      return {
        html: parent ? parent.outerHTML : 'Parent not found',
        childrenCount: parent ? parent.children.length : 0
      };
    })()
    `,
    returnByValue: true
  });
  console.log('Location Parent HTML:\n', details.result.value.html);
  ws.close();
  process.exit(0);
});
