const WebSocket = require('ws');

const ws = new WebSocket('ws://localhost:9222/devtools/page/1FCB69868E3DC4D66333179B09D7B130');

ws.on('open', () => {
  const code = `(() => {
    // Fill Address
    const inputs = Array.from(document.querySelectorAll('input'));
    const selects = Array.from(document.querySelectorAll('select'));

    // Find Street address
    const street = inputs.find(i => i.placeholder?.toLowerCase().includes('street') || i.name?.toLowerCase().includes('street') || i.name?.toLowerCase().includes('line1') || i.id?.toLowerCase().includes('line1'));
    if (street) {
      street.value = '451 Bengali square';
      street.dispatchEvent(new Event('input', { bubbles: true }));
      street.dispatchEvent(new Event('change', { bubbles: true }));
    }

    // City
    const city = inputs.find(i => i.placeholder?.toLowerCase().includes('city') || i.name?.toLowerCase().includes('city') || i.id?.toLowerCase().includes('city'));
    if (city) {
      city.value = 'Indore';
      city.dispatchEvent(new Event('input', { bubbles: true }));
      city.dispatchEvent(new Event('change', { bubbles: true }));
    }

    // Postal code
    const postal = inputs.find(i => i.placeholder?.toLowerCase().includes('postal') || i.name?.toLowerCase().includes('postal') || i.id?.toLowerCase().includes('postal'));
    if (postal) {
      postal.value = '452016';
      postal.dispatchEvent(new Event('input', { bubbles: true }));
      postal.dispatchEvent(new Event('change', { bubbles: true }));
    }

    // State select
    const stateSelect = selects.find(s => s.name?.toLowerCase().includes('state') || s.id?.toLowerCase().includes('state') || Array.from(s.options).some(o => o.text.includes('Madhya Pradesh')));
    let stateVal = null;
    if (stateSelect) {
      const mpOption = Array.from(stateSelect.options).find(o => o.text.toLowerCase().includes('madhya pradesh') || o.value.toLowerCase() === 'mp');
      if (mpOption) {
        stateSelect.value = mpOption.value;
        stateSelect.dispatchEvent(new Event('change', { bubbles: true }));
        stateVal = mpOption.text;
      }
    }

    return {
      streetVal: street ? street.value : null,
      cityVal: city ? city.value : null,
      postalVal: postal ? postal.value : null,
      stateVal: stateVal
    };
  })()`;
  ws.send(JSON.stringify({ id: 1, method: 'Runtime.evaluate', params: { expression: code, returnByValue: true } }));
});

ws.on('message', (msg) => {
  console.log('Result:', JSON.parse(msg).result.result.value);
  ws.close();
  process.exit(0);
});
