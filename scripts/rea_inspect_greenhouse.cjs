const WebSocket = require('C:/mcp/rea/node_modules/ws');

const targetId = 'F4E5FDC6CFA8F57DF722EF441F5FFFCB';
const ws = new WebSocket(`ws://127.0.0.1:9222/devtools/page/${targetId}`);

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
  await new Promise(r => setTimeout(r, 4000));

  const schema = await send('Runtime.evaluate', {
    expression: `
    (() => {
      const title = document.title;
      const inputs = Array.from(document.querySelectorAll('input, select, textarea')).map(i => ({
        tag: i.tagName,
        type: i.type,
        id: i.id,
        name: i.name,
        required: i.required,
        placeholder: i.placeholder,
        label: i.labels && i.labels[0] ? i.labels[0].innerText.trim() : null
      })).filter(x => x.type !== 'hidden');
      const submitBtn = Array.from(document.querySelectorAll('button, input[type="submit"]')).map(b => b.innerText || b.value).filter(Boolean);
      return { title, inputs, submitBtn };
    })()
    `,
    returnByValue: true
  });

  console.log('Greenhouse Enterpret Schema:\n', JSON.stringify(schema.result.value, null, 2));
  ws.close();
  process.exit(0);
});
