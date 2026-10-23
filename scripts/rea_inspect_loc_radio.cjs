const WebSocket = require('C:/mcp/rea/node_modules/ws');

const ws = new WebSocket('ws://127.0.0.1:9222/devtools/page/86641AE1A78B8C75E4203E4C24B52B9E');
ws.on('open', () => {
  ws.send(JSON.stringify({
    id: 1,
    method: 'Runtime.evaluate',
    params: {
      expression: `
      (() => {
        const labels = Array.from(document.querySelectorAll('label')).filter(l => l.innerText.includes('Location') || l.innerText.includes('How did you hear'));
        return labels.map(l => {
          const parent = l.closest('div');
          return {
            labelText: l.innerText.trim(),
            htmlFor: l.htmlFor,
            innerInputs: Array.from(parent.querySelectorAll('input, button, [role]')).map(x => ({
              tag: x.tagName,
              type: x.type,
              id: x.id,
              role: x.getAttribute('role'),
              className: x.className
            }))
          };
        });
      })()
      `,
      returnByValue: true
    }
  }));
});

ws.on('message', (d) => {
  const m = JSON.parse(d);
  if (m.id === 1) {
    console.log('Location & Radio Structure:\n', JSON.stringify(m.result.result.value, null, 2));
    ws.close();
    process.exit(0);
  }
});
