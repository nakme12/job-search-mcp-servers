const fs = require('fs');

const leads = JSON.parse(fs.readFileSync('C:\\mcp\\dm_extracted_leads.json', 'utf8'));
const poorneshItems = leads.filter(l => l.text.includes('Poornesh') || l.text.includes('Vandana Dhiman') || l.text.includes('Hardik Thapa'));

console.log('Poornesh thread items count:', poorneshItems.length);
poorneshItems.forEach((p, i) => {
  console.log(`\n================ Item #${i+1} ================`);
  console.log('Full Text:\n', p.text);
  console.log('Emails:\n', p.emails);
  console.log('Post Links:\n', p.postLinks);
});
