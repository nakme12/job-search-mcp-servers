import asyncio
import websockets
import json

async def test_cdp():
    uri = 'ws://127.0.0.1:9222/devtools/page/E47580F9E9B234F453B1E6E062C611C6'
    async with websockets.connect(uri) as ws:
        # Check current DOM
        req = {
            'id': 1,
            'method': 'Runtime.evaluate',
            'params': {
                'expression': 'document.querySelector("button[aria-label=\\"Attach\\"]") ? "ATTACH_FOUND" : "NOT_FOUND"',
                'returnByValue': True
            }
        }
        await ws.send(json.dumps(req))
        res = await ws.recv()
        print('CDP Response:', res)

asyncio.run(test_cdp())
