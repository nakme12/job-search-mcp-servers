const WebSocket = require('C:/mcp/job-search-mcp-engine/node_modules/ws');
const http = require('http');

const resumePath = 'C:\\mcp\\job-search-mcp-engine\\resumes\\Pratik Patidar Resume - MERN Full Stack.pdf';

http.get('http://127.0.0.1:9222/json/list', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const tabs = JSON.parse(data);
    const waTab = tabs.find(t => t.url && t.url.includes('web.whatsapp.com'));
    if (!waTab) {
      console.log('No WhatsApp Web tab found');
      return;
    }
    const ws = new WebSocket(waTab.webSocketDebuggerUrl);
    ws.on('open', () => {
      // Find the file input in WhatsApp Web (document/media attachment input)
      ws.send(JSON.stringify({
        id: 1,
        method: 'DOM.getDocument',
        params: { depth: -1 }
      }));
    });

    ws.on('message', (msg) => {
      const resp = JSON.parse(msg);
      if (resp.id === 1) {
        // Query selector for file inputs in WhatsApp
        ws.send(JSON.stringify({
          id: 2,
          method: 'DOM.querySelectorAll',
          params: {
            nodeId: resp.result.root.nodeId,
            selector: 'input[type="file"]'
          }
        }));
      } else if (resp.id === 2) {
        const nodeIds = resp.result.nodeIds;
        console.log('Found file inputs:', nodeIds.length);
        if (nodeIds.length > 0) {
          // Typically the first or second input accepts documents (* / application/pdf)
          // Let's set files on the document input or all file inputs
          const targetNode = nodeIds[nodeIds.length - 1]; // Document attachment input
          ws.send(JSON.stringify({
            id: 3,
            method: 'DOM.setFileInputFiles',
            params: {
              files: [resumePath],
              nodeId: targetNode
            }
          }));
        } else {
          // If no input tag found in DOM, click attach button (+) first
          ws.send(JSON.stringify({
            id: 4,
            method: 'Runtime.evaluate',
            params: {
              expression: `(() => {
                const plusBtn = document.querySelector('span[data-icon="plus"]') || document.querySelector('button[title="Attach"]');
                if (plusBtn) {
                  plusBtn.closest('button, div[role="button"]').click();
                  return 'Clicked plus button';
                }
                return 'Plus button not found';
              })()`
            }
          }));
        }
      } else if (resp.id === 3) {
        console.log('Set file input result:', resp);
        ws.close();
        process.exit(0);
      } else if (resp.id === 4) {
        console.log('Attach click:', resp.result.result.value);
        setTimeout(() => {
          ws.send(JSON.stringify({
            id: 5,
            method: 'DOM.getDocument',
            params: { depth: -1 }
          }));
        }, 800);
      } else if (resp.id === 5) {
        ws.send(JSON.stringify({
          id: 6,
          method: 'DOM.querySelectorAll',
          params: {
            nodeId: resp.result.root.nodeId,
            selector: 'input[type="file"]'
          }
        }));
      } else if (resp.id === 6) {
        const nodeIds = resp.result.nodeIds;
        console.log('File inputs after attach menu:', nodeIds.length);
        if (nodeIds.length > 0) {
          // Set to document input (usually node with accept=* or application/pdf)
          ws.send(JSON.stringify({
            id: 7,
            method: 'DOM.setFileInputFiles',
            params: {
              files: [resumePath],
              nodeId: nodeIds[0]
            }
          }));
        } else {
          ws.close();
          process.exit(0);
        }
      } else if (resp.id === 7) {
        console.log('Successfully attached file via CDP!');
        ws.close();
        process.exit(0);
      }
    });
  });
});
