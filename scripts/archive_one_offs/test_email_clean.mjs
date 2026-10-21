const samples = [
  'anushkag@teknobloomconsulting.com',
  'support@dailytrades.inSubject',
  'jobs.planetplacements@gmail.comThanks',
  'parthvi.meka@gmail.comExperience',
  'careers@skyfishglobal.com',
  'hr@anvtech.coor',
  'hr@anvtech.co',
  'hr@nextmoveindia.inor'
];

function cleanEmail(raw) {
  return raw.replace(/(\.(?:co\.in|com|org|net|edu|gov|co|in))(?![a-zA-Z]*\.[a-zA-Z])[a-zA-Z]+$/i, (match, tld) => {
    return tld;
  });
}

function cleanEmailBetter(raw) {
  // If ends with known tld + trailing words like Thanks, Subject, Experience, or, etc.
  const m = raw.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.(?:co\.in|com|org|net|edu|gov|co|in))/i);
  return m ? m[1] : raw;
}

for (const s of samples) {
  console.log(s, '->', cleanEmailBetter(s));
}
