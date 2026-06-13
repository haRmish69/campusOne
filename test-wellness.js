fetch("http://localhost:3000/api/wellness-sync", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    text: "Sleep: 7 hours, Mood: 5/10, Stress: 5/10. Energy: high, Meals: yes, Academic pressure: a_little",
    userId: "user_3F4DkLKBAIDCkvtqOSB66Rgffj9"
  })
}).then(async r => {
  console.log("Status:", r.status);
  console.log("Body:", await r.text());
}).catch(console.error);
