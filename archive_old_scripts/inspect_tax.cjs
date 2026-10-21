const fs = require('fs');
const WebSocket = require('ws');

const ws = new WebSocket('ws://localhost:9222/devtools/page/9F9016A36E57A6A9C58587FD8906B212');

ws.on('open', () => {
  const code = `(() => {
    return Array.from(document.querySelectorAll('input, select, textarea')).map(e => ({
      id: e.id,
      name: e.name,
      type: e.type,
      val: e.value,
      tag: e.tagName,
      options: e.tagName === 'SELECT' ? Array.from(e.options).map(o => ({text: o.text, value: o.value})) : []
    }));
  })()`;
  ws.send(JSON.stringify({ id: 1, method: 'Runtime.evaluate', params: { expression: code, returnByValue: true } }));
});

ws.on('message', (msg) => {
  const res = JSON.parse(msg);
  fs.writeFileSync('tax_fields.json', JSON.stringify(res.result.result.value, null, 2));
  console.log('Saved fields count:', res.result.result.value ? res.result.result.value.length : 0);
  ws.close();
  process.exit(0);
});
