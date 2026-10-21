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
      // Find the submit button and check why disabled
      const btn = document.querySelector('[data-testid="v2-reskin-submit-button"]');
      const errs = Array.from(document.querySelectorAll('[class*="error"], [role="alert"], [aria-invalid="true"]')).map(e => e.innerText || e.outerHTML);
      const inputs = Array.from(document.querySelectorAll('input, select')).map(e => ({
        placeholder: e.placeholder,
        value: e.value,
        ariaInvalid: e.getAttribute('aria-invalid'),
        disabled: e.disabled
      }));
      return {
        btnExists: !!btn,
        btnDisabled: btn?.getAttribute('aria-disabled'),
        errs,
        inputs
      };
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
    console.log('Form State:', JSON.stringify(data.result.result.value, null, 2));
    ws.close();
    process.exit(0);
  }
});
