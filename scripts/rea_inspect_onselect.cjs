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
      const fiberKey = Object.keys(input).find(k => k.startsWith('__reactFiber'));
      let node = input[fiberKey];
      while (node) {
        if (node.memoizedProps && typeof node.memoizedProps.onSelect === 'function') {
          return {
            onSelectStr: node.memoizedProps.onSelect.toString().slice(0, 300),
            availableProps: Object.keys(node.memoizedProps)
          };
        }
        node = node.return;
      }
      return 'onSelect not found';
    })()
    `,
    returnByValue: true
  });
  console.log('onSelect inspect:', JSON.stringify(res.result.value, null, 2));
  ws.close();
  process.exit(0);
});
