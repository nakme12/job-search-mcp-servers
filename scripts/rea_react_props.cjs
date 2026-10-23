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
  const res = await send('Runtime.evaluate', {
    expression: `
    (() => {
      const input = document.querySelector('input[placeholder="Start typing..."]');
      if (!input) return 'no input';
      const reactKey = Object.keys(input).find(k => k.startsWith('__reactFiber') || k.startsWith('__reactProps'));
      const props = reactKey ? input[reactKey] : null;
      return {
        reactKey,
        propNames: props ? Object.keys(props) : []
      };
    })()
    `,
    returnByValue: true
  });
  console.log('React internal props:', res.result.value);
  ws.close();
  process.exit(0);
});
