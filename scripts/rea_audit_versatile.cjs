const WebSocket = require('C:/mcp/rea/node_modules/ws');

const ws = new WebSocket('ws://127.0.0.1:9222/devtools/page/1730E7BDF9C5F67FC62CDDEBC1D6F812');
ws.on('open', () => {
  ws.send(JSON.stringify({
    id: 1,
    method: 'Runtime.evaluate',
    params: {
      expression: `
      (() => {
        const form = document.querySelector('form#thjmf_job_application');
        const notices = Array.from(document.querySelectorAll('.thjmf-message, [class*="message"], [class*="notice"], [class*="alert"]')).map(el => el.innerText.trim());
        const values = {
          name: document.querySelector('#name')?.value,
          email: document.querySelector('#email')?.value,
          phone: document.querySelector('#phone')?.value,
          resume: document.querySelector('#resume')?.value
        };
        return { notices, values, hasForm: !!form };
      })()
      `,
      returnByValue: true
    }
  }));
});

ws.on('message', d => {
  const m = JSON.parse(d);
  if (m.id === 1) {
    console.log('Versatile Audit State:\n', JSON.stringify(m.result.result.value, null, 2));
    ws.close();
    process.exit(0);
  }
});
