const WebSocket = require('ws');

const ws = new WebSocket('ws://localhost:9222/devtools/page/9F9016A36E57A6A9C58587FD8906B212');

ws.on('open', async () => {
  // Focus the input
  ws.send(JSON.stringify({
    id: 1,
    method: 'Runtime.evaluate',
    params: {
      expression: `(() => {
        const el = document.getElementById('Line10ClaimArticleandParagraph');
        if (el) el.focus();
        return !!el;
      })()`,
      returnByValue: true
    }
  }));
});

ws.on('message', (msg) => {
  const data = JSON.parse(msg);
  if (data.id === 1) {
    console.log('Focused element:', data.result.result.value);
    // Send Input.insertText
    ws.send(JSON.stringify({
      id: 2,
      method: 'Input.insertText',
      params: { text: '15' }
    }));
  } else if (data.id === 2) {
    console.log('Inserted text via CDP');
    // Check value
    ws.send(JSON.stringify({
      id: 3,
      method: 'Runtime.evaluate',
      params: {
        expression: `(() => {
          const el = document.getElementById('Line10ClaimArticleandParagraph');
          return el ? el.value : 'missing';
        })()`,
        returnByValue: true
      }
    }));
  } else if (data.id === 3) {
    console.log('Current value after insertText:', data.result.result.value);
    ws.close();
    process.exit(0);
  }
});
