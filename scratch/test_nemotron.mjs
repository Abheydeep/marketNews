async function run() {
  console.log("Starting Nemotron test...");
  const startTime = Date.now();
  try {
    const res = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer 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"
      },
      body: JSON.stringify({
        model: "nvidia/nemotron-3-ultra-550b-a55b",
        messages: [{ role: "user", content: "Say hello!" }]
      })
    });
    console.log("Nemotron Status:", res.status, "in", Date.now() - startTime, "ms");
    const data = await res.json();
    console.log("Data:", JSON.stringify(data).slice(0, 100));
  } catch(e) {
    console.error(e);
  }
}
run();
