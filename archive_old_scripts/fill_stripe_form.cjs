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
      function setVal(input, val) {
        if (!input) return;
        input.focus();
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        nativeInputValueSetter.call(input, val);
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }

      const street = document.querySelector('input[placeholder="Street address"]');
      setVal(street, '451 Bengali square');

      const city = document.querySelector('input[placeholder="City"]');
      setVal(city, 'Indore');

      const postal = document.querySelector('input[placeholder="Postal code"]');
      setVal(postal, '452016');

      const select = document.querySelector('select');
      if (select) {
        const mpOpt = Array.from(select.options).find(o => o.text.toLowerCase().includes('madhya pradesh') || o.value.toLowerCase() === 'mp');
        if (mpOpt) {
          select.value = mpOpt.value;
          select.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }

      return {
        street: street?.value,
        city: city?.value,
        postal: postal?.value,
        state: select?.value,
        stateText: select?.selectedOptions[0]?.text
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
    console.log('Filled recipient details:', data.result.result.value);
    ws.close();
    process.exit(0);
  }
});
