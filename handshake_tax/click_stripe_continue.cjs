const WebSocket = require('ws');

const ws = new WebSocket('ws://localhost:9222/devtools/page/1FCB69868E3DC4D66333179B09D7B130');

ws.on('open', () => {
  ws.send(JSON.stringify({
    id: 1,
    method: 'Page.createIsolatedWorld',
    params: {
      frameId: '84FCF5D679A7CDC138F6633D9F4C1841',
      worldName: 'stripeUiWorld'
    }
  }));
});

ws.on('message', (msg) => {
  const data = JSON.parse(msg);
  if (data.id === 1) {
    const ctxId = data.result.executionContextId;
    const code = `(() => {
      const btn = document.querySelector('button[type="submit"]') || Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Continue'));
      if (btn) {
        btn.click();
        return 'Clicked Continue';
      }
      return 'Button not found';
    })()`;

    ws.send(JSON.stringify({
      id: 2,
      method: 'Runtime.evaluate',
      params: {
        expression: code,
        contextId: ctxId,
        returnByValue: true
      }
    }));
  } else if (data.id === 2) {
    console.log('Result:', data.result.result.value);
    ws.close();
    process.exit(0);
  }
});
