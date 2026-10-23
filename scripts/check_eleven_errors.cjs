const WebSocket = require('C:/mcp/rea/node_modules/ws');

const ws = new WebSocket('ws://127.0.0.1:9222/devtools/page/86641AE1A78B8C75E4203E4C24B52B9E');
ws.on('open', async () => {
  let id = 1;
  const send = (m, p) => new Promise(r => {
    ws.on('message', function h(d) {
      const msg = JSON.parse(d);
      if (msg.id === id) { ws.off('message', h); r(msg.result); }
    });
    ws.send(JSON.stringify({ id: id++, method: m, params: p }));
  });
  await send('Runtime.enable');
  const res = await send('Runtime.evaluate', {
    expression: `
    (() => {
      const errBox = document.querySelector('[class*="errorBanner"], [class*="Error"], [class*="banner"]');
      const text = document.body ? document.body.innerText : '';
      const match = text.match(/Your form needs corrections[\\s\\S]{0,400}/);
      return {
        banner: errBox ? errBox.innerText : null,
        snippet: match ? match[0] : null
      };
    })()
    `,
    returnByValue: true
  });
  console.log('ACTIVE ASHBY ERRORS:', res.result.value);
  ws.close();
  process.exit(0);
});
