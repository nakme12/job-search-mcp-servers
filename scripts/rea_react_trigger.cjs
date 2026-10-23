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
      const propsKey = Object.keys(input).find(k => k.startsWith('__reactProps'));
      const props = propsKey ? input[propsKey] : null;
      if (props && typeof props.onChange === 'function') {
        props.onChange({ target: { value: 'India' } });
        return 'Invoked props.onChange with India!';
      }
      return 'props.onChange not found';
    })()
    `,
    returnByValue: true
  });
  console.log('Direct React props invocation:', res.result.value);

  // Check if options appeared in DOM
  await new Promise(r => setTimeout(r, 1000));
  const listbox = await send('Runtime.evaluate', {
    expression: `
    (() => {
      const options = Array.from(document.querySelectorAll('[role="option"], [class*="option"], [class*="item"]')).map(el => el.innerText.trim());
      return options.slice(0, 10);
    })()
    `,
    returnByValue: true
  });
  console.log('Listbox options after onChange:', listbox.result.value);

  ws.close();
  process.exit(0);
});
