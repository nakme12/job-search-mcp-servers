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
      let depth = 0;
      let foundHandlers = [];
      while (node && depth < 10) {
        if (node.memoizedProps) {
          const keys = Object.keys(node.memoizedProps).filter(k => k.toLowerCase().includes('select') || k.toLowerCase().includes('change') || k.toLowerCase().includes('location') || k.toLowerCase().includes('country'));
          if (keys.length > 0) {
            foundHandlers.push({ depth, component: node.type?.name || node.type?.displayName || 'Anonymous', keys });
          }
        }
        node = node.return;
        depth++;
      }
      return foundHandlers;
    })()
    `,
    returnByValue: true
  });
  console.log('React Component Tree Handlers:\n', JSON.stringify(res.result.value, null, 2));
  ws.close();
  process.exit(0);
});
