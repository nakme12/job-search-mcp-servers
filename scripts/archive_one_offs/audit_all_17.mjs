async function auditAll17() {
  const list = [
    { name: 'Infosys Limited', url: 'https://www.foundit.in/job/react-js-developer-infosys-limited-pune-69362856', platform: 'Foundit' },
    { name: 'Sanchit Life Insurance', url: 'https://www.placementindia.com/job-detail/frontend-developer-in-lavenya-creators-at-delhi-1420904.htm', platform: 'PlacementIndia' },
    { name: 'Talent Zone Consultant', url: 'https://www.placementindia.com/job-detail/react-developer-in-talent-zone-consultant-at-bangalore-1400223.htm', platform: 'PlacementIndia' },
    { name: 'Gloomshine Services', url: 'https://www.placementindia.com/job-detail/react-js-developer-in-gloomshine-services-private-limited-at-sector-63-noida-1350158.htm', platform: 'PlacementIndia' },
    { name: 'Hire India Consulting', url: 'https://www.placementindia.com/job-detail/full-stack-developer-in-hire-india-consulting-at-delhi-1406233.htm', platform: 'PlacementIndia' },
    { name: 'Therapy Mantra', url: 'https://www.placementindia.com/job-detail/full-stack-developer-in-therapy-mantra-at-delhi-1355155.htm', platform: 'PlacementIndia' },
    { name: 'Emet Infotech Solutions', url: 'https://www.placementindia.com/job-detail/software-developer-in-emet-infotech-solutions-at-delhi-1320264.htm', platform: 'PlacementIndia' },
    { name: 'Kishan Freelancer', url: 'https://www.placementindia.com/job-detail/web-developer-in-kishan-freelancer-at-delhi-1299351.htm', platform: 'PlacementIndia' },
    { name: 'Protective Collar AI', url: 'https://www.placementindia.com/job-detail/full-stack-developer-in-protective-collar-ai-technology-pvt-ltd-at-sector-16-noida-1351369.htm', platform: 'PlacementIndia' },
    { name: 'Rakesh Shopping', url: 'https://www.placementindia.com/job-detail/web-developer-in-rakesh-shopping-at-muzaffarpur-vaishali-bilaspur-1285196.htm', platform: 'PlacementIndia' },
    { name: 'NeurolinkX', url: 'https://www.placementindia.com/job-detail/full-stack-developer-in-neurolinkx-at-kanpur-noida-1362376.htm', platform: 'PlacementIndia' },
    { name: 'Crenovent Technologies', url: 'https://www.placementindia.com/job-detail/full-stack-developer-in-crenovent-technologies-pvt-ltd-at-sector-96-noida-1314109.htm', platform: 'PlacementIndia' },
    { name: 'Midbrains Technologies', url: 'https://www.placementindia.com/job-detail/front-end-developer-in-midbrains-technologies-at-wakad-pune-1378072.htm', platform: 'PlacementIndia' },
    { name: 'Novartis', url: 'https://www.placementindia.com/job-detail/looking-for-full-stack-developer-fresher-jobs-in-pune-delhi-for-novartis-1276907.htm', platform: 'PlacementIndia' },
    { name: 'Anisht', url: 'https://www.placementindia.com/job-detail/full-stack-developer-in-anisht-at-chandigarh-ramkote-hyderabad-1350684.htm', platform: 'PlacementIndia' },
    { name: 'CDAT Pvt. Ltd', url: 'https://www.placementindia.com/job-detail/react-js-developer-in-cdat-pvt-ltd-at-navale-bridge-pune-1317459.htm', platform: 'PlacementIndia' },
    { name: 'Global Placement', url: 'https://www.placementindia.com/job-detail/react-js-developer-in-global-placement-at-pune-1277928.htm', platform: 'PlacementIndia' }
  ];

  for (const item of list) {
    try {
      const res = await fetch(item.url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } });
      const html = await res.text();
      let exp = 'Unknown';
      const mJson = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi);
      if (mJson) {
        for (const tag of mJson) {
          try {
            const parsed = JSON.parse(tag.replace(/<[^>]+>/g, ''));
            if (parsed['@type'] === 'JobPosting') {
              exp = parsed.experienceRequirements || parsed.occupationalCategory || exp;
            }
          } catch(e) {}
        }
      }
      if (exp === 'Unknown') {
        const mHtml = html.match(/(?:Work Experience|Experience)[\s\S]{1,150}?(Fresher|\d+\s*-\s*\d+\s*Years?)/i);
        if (mHtml) exp = mHtml[1];
      }
      console.log(`[${item.name}] Exp: ${exp}`);
    } catch(err) {
      console.log(`[${item.name}] Fetch Err: ${err.message}`);
    }
  }
}

auditAll17();
