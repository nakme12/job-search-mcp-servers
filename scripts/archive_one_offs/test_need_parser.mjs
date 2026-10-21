const card = '<ul class="sjci-need"><li><img src="https://static.placementindia.com/images/icon_exp.svg" width="14" height="14" decoding="async" alt=""> 0 - 1 yrs</li><li><img src="https://static.placementindia.com/images/rupee.svg" width="12" height="12" decoding="async" alt=""> 3.0 Lac/Yr</li><li><img src="https://static.placementindia.com/images/icon_location.svg" width="14" height="14" decoding="async" alt=""></i> <span>Nashik</span></li></ul>';
const lis = card.match(/<li[^>]*>([\s\S]*?)<\/li>/gi) || [];
console.log('lis count:', lis.length);

function cleanHtmlText(str) {
  return (str || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

let experienceText = "";
let salaryText = "";
let locationText = "";

for (const li of lis) {
  const text = cleanHtmlText(li);
  if (li.includes("icon_exp")) {
    experienceText = text;
  } else if (li.includes("rupee") || /lac|inr|₹/i.test(text)) {
    salaryText = text;
  } else if (li.includes("icon_location")) {
    locationText = text;
  }
}

console.log({ experienceText, salaryText, locationText });
