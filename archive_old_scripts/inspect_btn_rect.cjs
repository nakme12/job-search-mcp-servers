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
      const continueEl = Array.from(document.querySelectorAll('*')).find(el => el.children.length === 0 && el.textContent.trim() === 'Continue');
      if (continueEl) {
        const btn = continueEl.closest('button') || continueEl.closest('div[role="button"]') || continueEl.parentElement;
        const rect = (btn || continueEl).getBoundingClientRect();
        return {
          tag: (btn || continueEl).tagName,
          outerHTML: (btn || continueEl).outerHTML.substring(0, 200),
          rect: { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 }
        };
      }
      return null;
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
    console.log('Button details:', data.result.result.value);
    ws.close();
    process.exit(0);
  }
});
