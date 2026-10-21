import puppeteer from 'puppeteer-core';
import path from 'path';
import fs from 'fs';

const TARGETS = [
  {
    company: 'Axquora',
    salutation: 'Hi Axquora Hiring Team,',
    email: 'hr@axquora.com',
    role: 'Frontend Developer',
    resumeName: 'Pratik Patidar Resume - Frontend Engineer.pdf',
    subject: 'Application for Frontend Developer - Pratik Patidar (1.5+ YOE | React.js / Frontend)'
  },
  {
    company: 'Elevate Tech',
    salutation: 'Hi Elevate Tech Hiring Team,',
    email: 'careers@elevatetech.in',
    role: 'Full Stack / MERN Developer',
    resumeName: 'Pratik Patidar Resume - MERN Full Stack.pdf',
    subject: 'Application for Full Stack / MERN Developer - Pratik Patidar (1.5+ YOE | MERN Stack)'
  },
  {
    company: 'Cybersify',
    salutation: 'Hi Cybersify Hiring Team,',
    email: 'hr@cybersify.tech',
    role: 'Full Stack Developer',
    resumeName: 'Pratik Patidar Resume - MERN Full Stack.pdf',
    subject: 'Application for Full Stack Developer - Pratik Patidar (1.5+ YOE | MERN / Full Stack)'
  },
  {
    company: 'Liftor',
    salutation: 'Hi Liftor Hiring Team,',
    email: 'admin@liftor.in',
    role: 'Full Stack / React Native Developer',
    resumeName: 'Pratik Patidar Resume - MERN Full Stack.pdf',
    subject: 'Application for Full Stack Developer - Pratik Patidar (1.5+ YOE | React / Node.js)'
  },
  {
    company: 'Recharge Studio',
    salutation: 'Hi Recharge Studio Hiring Team,',
    email: 'sakshi.yadav@reachargestudio.com',
    role: 'React Developer',
    resumeName: 'Pratik Patidar Resume - React Developer.pdf',
    subject: 'Application for React Developer - Pratik Patidar (1.5+ YOE | React.js / Web)'
  }
];

function getEmailBody(target) {
  return `${target.salutation}

I am writing to express my strong interest in the ${target.role} opportunity at ${target.company}. With 1.5+ years of hands-on experience building performant, responsive web applications, I specialize in React.js, Next.js, TypeScript, Node.js, and modern full-stack development.

Key Highlights of My Experience:
• Core Frontend: Proficient in React.js, Next.js (App Router, SSR/SSG), TypeScript, Redux Toolkit, and Tailwind CSS.
• Full Stack & Backend: Experience designing RESTful APIs with Node.js and Express, database modeling with MongoDB / PostgreSQL, and state management.
• Quality & Optimization: Focused on clean component architecture, Core Web Vitals optimization, and responsive design.

My portfolio and live work can be viewed at: https://pratikpatidar.vercel.app/
GitHub: https://github.com/pratikpatidar
LinkedIn: https://www.linkedin.com/in/pratik-patidar-b8929a228/

I have attached my resume (${target.resumeName}) for your review. I would welcome the opportunity to discuss how my technical skills and enthusiasm can contribute to the team at ${target.company}.

Thank you for your time and consideration.

Best regards,
Pratik Patidar
Phone: +91 8269647990
Email: patidarpratik0099@gmail.com`;
}

console.log('Pre-flight assertions check:');
TARGETS.forEach((t, i) => {
  const resumePath = path.resolve('resumes', t.resumeName);
  const exists = fs.existsSync(resumePath);
  console.log(`[Target ${i+1}] ${t.company} -> Email: ${t.email} | Salutation: "${t.salutation}" | Resume Exists: ${exists} (${t.resumeName})`);
});
