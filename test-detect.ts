import fs from 'fs';

async function testDetect() {
  const dummyBase64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
  
  console.log("Sending test POST request to http://localhost:3000/api/notes/detect-subject");
  try {
    const res = await fetch("http://localhost:3000/api/notes/detect-subject", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "file",
        data: dummyBase64,
        fileName: "test.png"
      })
    });
    
    console.log("Status:", res.status, res.statusText);
    const text = await res.text();
    console.log("Response:", text);
  } catch (error) {
    console.error("Fetch failed:", error);
  }
}

testDetect();
