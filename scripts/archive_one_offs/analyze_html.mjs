import * as cheerio from 'cheerio';
import fs from 'fs';

const html = fs.readFileSync('C:/mcp/job-search-mcp-engine/scripts/placementindia_sample.html', 'utf-8');
const $ = cheerio.load(html);

console.log('Title:', $('title').text());
console.log('div elements sample classes:');
const classes = new Set();
$('[class]').each((i, el) => {
  const cls = $(el).attr('class');
  if (cls) {
    cls.split(/\s+/).forEach(c => {
      if (c.toLowerCase().includes('job') || c.toLowerCase().includes('result') || c.toLowerCase().includes('item') || c.toLowerCase().includes('card') || c.toLowerCase().includes('post')) {
        classes.add(c);
      }
    });
  }
});
console.log('Matching classes:', Array.from(classes).slice(0, 40));
