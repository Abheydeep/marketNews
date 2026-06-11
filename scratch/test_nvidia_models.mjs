async function run() {
  if (!process.env.NVIDIA_API_KEY) throw new Error("Set NVIDIA_API_KEY before running this scratch script.");
  console.log("Starting test with valid model...");
  try {
    const res = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.NVIDIA_API_KEY}`
      },
      body: JSON.stringify({
        model: "meta/llama-3.1-8b-instruct",
        messages: [{ role: "user", content: "Say hello!" }]
      })
    });
    console.log("Status:", res.status);
    const data = await res.json();
    console.log("Data:", JSON.stringify(data).slice(0, 100));
  } catch(e) {
    console.error(e);
  }
}
run();
