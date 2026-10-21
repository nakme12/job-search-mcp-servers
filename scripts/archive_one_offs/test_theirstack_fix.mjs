import "dotenv/config";

async function run() {
  const payload = {
    page: 0,
    limit: 10,
    posted_at_max_age_days: 7,
    job_country_code_or: ["IN"]
  };
  const res = await fetch("https://api.theirstack.com/v1/jobs/search", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.THEIRSTACK_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
  console.log("TheirStack Status:", res.status);
  const data = await res.json();
  console.log("Total Jobs Returned:", data.data?.length);
  if (data.data?.length) {
    console.log("Sample:", data.data[0].job_title, "| Company:", data.data[0].company_name);
  }
}

run().catch(console.error);
