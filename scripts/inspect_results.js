import https from 'https';
import http from 'http';
import fs from 'fs';

const items = JSON.parse(fs.readFileSync('D:/adi/mcp/stream_b_tg_scraped_fresh.json', 'utf8'));

console.log('Current items:', items.length);
