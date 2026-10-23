const WebSocket = require('C:/mcp/rea/node_modules/ws');

const ws = new WebSocket('ws://127.0.0.1:9222/devtools/page/86641AE1A78B8C75E4203E4C24B52B9E');
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
  await send('Input.enable');

  // Find location input coordinates
  const locBox = await send('Runtime.evaluate', {
    expression: `
    (() => {
      const inp = document.querySelector('input[placeholder="Start typing..."], input[role="combobox"]');
      if (inp) {
        const rect = inp.getBoundingClientRect();
        return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      }
      return null;
    })()
    `,
    returnByValue: true
  });
  console.log('Location input box coords:', locBox.result.value);

  const { x, y } = locBox.result.value;
  // Click location box
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
  await new Promise(r => setTimeout(r, 500));

  // Type 'India' using simulated keyboard
  for (const char of 'India') {
    await send('Input.dispatchKeyEvent', { type: 'keyDown', text: char, unmodifiedText: char });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', text: char, unmodifiedText: char });
    await new Promise(r => setTimeout(r, 100));
  }
  await new Promise(r => setTimeout(r, 1500));

  // Press ArrowDown and Enter
  await send('Input.dispatchKeyEvent', { type: 'keyDown', windowsVirtualKeyCode: 40 });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', windowsVirtualKeyCode: 40 });
  await new Promise(r => setTimeout(r, 300));
  await send('Input.dispatchKeyEvent', { type: 'keyDown', windowsVirtualKeyCode: 13 });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', windowsVirtualKeyCode: 13 });
  await new Promise(r => setTimeout(r, 1500));

  // Check what value is in the input now
  const valCheck = await send('Runtime.evaluate', {
    expression: 'document.querySelector("input[role=\\"combobox\\"]")?.value',
    returnByValue: true
  });
  console.log('Combobox value after keyboard selection:', valCheck.result.value);

  ws.close();
  process.exit(0);
});
