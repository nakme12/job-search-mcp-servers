import axios from 'axios';
import * as cheerio from 'cheerio';

async function test() {
  try {
    const url = 'https://www.adzuna.in/details/5913885939?utm_medium=api&utm_source=22d4b243';
    console.log('Fetching:', url);
    const res = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      },
      timeout: 15000
    });
    console.log('Status:', res.status);
    const $ = cheerio.load(res.data);
    const applyLinks = [];
    $('a').each((i, el) => {
      const href = $(el).attr('href');
      const text = $(el).text().trim();
      if (href && (href.includes('/land/ad/') || text.toLowerCase().includes('apply'))) {
        applyLinks.push({ href, text });
      }
    });
    console.log('Apply links found:', applyLinks);

    if (applyLinks.length > 0) {
      let landUrl = applyLinks[0].href;
      if (landUrl.startsWith('/')) {
        landUrl = 'https://www.adzuna.in' + landUrl;
      }
      console.log('Following redirect for:', landUrl);
      const resLand = await axios.get(landUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
        },
        maxRedirects: 10,
        timeout: 15000,
        validateStatus: () => true
      });
      const finalUrl = resLand.request?.res?.responseUrl || resLand.config.url;
      console.log('Final URL:', finalUrl);
      console.log('Status code:', resLand.status);
      console.log('Snippet length:', resLand.data?.length);
    }
  } catch (err) {
    console.error('Error:', err.message);
  }
}

test();
