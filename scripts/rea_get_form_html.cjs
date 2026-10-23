const WebSocket = require('C:/mcp/rea/node_modules/ws');

const ws = new WebSocket('ws://127.0.0.1:9222/devtools/page/1730E7BDF9C5F67FC62CDDEBC1D6F812');
ws.on('open', () => {
  ws.send(JSON.stringify({
    id: 1,
    method: 'Runtime.evaluate',
    params: {
      expression: 'document.querySelector("form#thjmf_job_application")?.outerHTML || "No form"',
      returnByValue: true
    }
  }));
});

ws.on('message', d => {
  const m = JSON.parse(d);
  if (m.id === 1) {
    console.log('FORM OUTER HTML:\n', m.result.result.value);
    ws.close();
    process.exit(0);
  }
});
