import "dotenv/config";

async function testKeys() {
  // 1. Hirebase
  console.log("=== HIREBASE KEY TEST ===");
  try {
    const res = await fetch("https://api.hirebase.org/v1/jobs", {
      headers: { Authorization: `Bearer ${process.env.HIREBASE_API_KEY}` }
    });
    console.log("Status:", res.status);
    console.log("Body:", await res.text());
  } catch (e) {
    console.error("Error:", e.message);
  }

  // 2. TheirStack
  console.log("\n=== THEIRSTACK KEY TEST ===");
  try {
    const res = await fetch("https://api.theirstack.com/v1/jobs/search", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.THEIRSTACK_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ page: 0, limit: 5 })
    });
    console.log("Status:", res.status);
    console.log("Body:", await res.text());
  } catch (e) {
    console.error("Error:", e.message);
  }
}

testKeys().catch(console.error);
