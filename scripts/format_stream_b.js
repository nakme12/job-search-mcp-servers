import fs from 'fs';

const verifiedList = [
  {
    company: "Nexgensis Technologies",
    title: "React.js Developer",
    location: "Pune",
    posted_date: "2026-10-03",
    experience: "0-1 YOE (Fresher)",
    tech_stack: "React.js, JavaScript, HTML/CSS, REST APIs",
    url: "https://docs.google.com/forms/d/e/1FAIpQLSdJGTfmNxFbqPulYMGiSHXcMjhHSjjg_L6FXSDuLiYvtWfOnw/viewform",
    contact_email: "",
    source: "Telegram"
  },
  {
    company: "Tesla",
    title: "Frontend Software Engineer",
    location: "Across India",
    posted_date: "2026-10-01",
    experience: "0-2 YOE",
    tech_stack: "React.js, JavaScript, HTML5, CSS3, REST APIs",
    url: "https://fvoice.site/qk0b",
    contact_email: "",
    source: "Telegram"
  },
  {
    company: "Razorpay",
    title: "Frontend Engineer",
    location: "Bangalore",
    posted_date: "2026-10-01",
    experience: "1-2 YOE",
    tech_stack: "React.js, Redux, JavaScript, TypeScript, Webpack",
    url: "https://offcampusjobs4u.com/razorpay-recruitment-2026-frontend-engineer/",
    contact_email: "",
    source: "Telegram"
  },
  {
    company: "Giesecke+Devrient",
    title: "Java Spring Boot & React Developer",
    location: "Pune",
    posted_date: "2026-10-02",
    experience: "0-1 YOE",
    tech_stack: "React.js, Java Spring Boot, REST APIs, JavaScript",
    url: "https://telegram.me/merntech",
    contact_email: "",
    source: "Telegram"
  },
  {
    company: "Kaspro IT Solutions",
    title: "Full Stack Developer (MERN)",
    location: "Mohali / Remote",
    posted_date: "2026-10-02",
    experience: "0-1 YOE (Fresher)",
    tech_stack: "React.js, Node.js, Express.js, MongoDB, JavaScript",
    url: "https://telegram.me/merntech",
    contact_email: "",
    source: "Telegram"
  },
  {
    company: "Infineon Technologies",
    title: "Junior Software Developer",
    location: "Bangalore",
    posted_date: "2026-10-04",
    experience: "0-2 YOE",
    tech_stack: "JavaScript, React.js, Web Technologies, REST APIs",
    url: "https://offcampusjobs4u.com/infineon-recruitment-2026-junior-software-developer/",
    contact_email: "",
    source: "Telegram"
  },
  {
    company: "Appinventiv",
    title: "Software Engineer (Frontend)",
    location: "Noida / Delhi NCR",
    posted_date: "2026-09-30",
    experience: "0-2 YOE",
    tech_stack: "React.js, Next.js, JavaScript, HTML/CSS",
    url: "https://fvoice.site/ftv1",
    contact_email: "",
    source: "Telegram"
  },
  {
    company: "Flex",
    title: "Associate Software Engineer (UI/Frontend)",
    location: "Chennai",
    posted_date: "2026-10-01",
    experience: "0-2 YOE",
    tech_stack: "JavaScript, HTML5, CSS3, UI Frameworks",
    url: "https://fvoice.site/zm9u",
    contact_email: "",
    source: "Telegram"
  }
];

fs.writeFileSync('D:/adi/mcp/stream_b_tg_scraped_fresh.json', JSON.stringify(verifiedList, null, 2));
console.log(`Successfully wrote ${verifiedList.length} verified listings to D:/adi/mcp/stream_b_tg_scraped_fresh.json`);
