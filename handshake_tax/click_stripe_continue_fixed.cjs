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
    // Find continue button and click
    const code = `(() => {
      // Find element with text Continue
      const allEls = Array.from(document.querySelectorAll('*'));
      const continueEl = allEls.find(el => el.children.length === 0 && el.textContent.trim() === 'Continue');
      if (continueEl) {
        const btn = continueEl.closest('button') || continueEl.parentElement;
        (btn || continueEl).click();
        return { clicked: true, tag: (btn || continueEl).tagName };
      }
      return { clicked: false };
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
    console.log('Click result:', data.result.result.value);
    ws.close();
    process.exit(0);
  }
});
