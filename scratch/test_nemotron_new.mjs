async function run() {
  if (!process.env.NVIDIA_API_KEY) throw new Error("Set NVIDIA_API_KEY before running this scratch script.");
  console.log("Starting new Nemotron test...");
  const startTime = Date.now();
  try {
    const res = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.NVIDIA_API_KEY}`
      },
      body: JSON.stringify({
        model: "nvidia/nemotron-3-ultra-550b-a55b",
        messages: [{ role: "user", content: "Say hello!" }],
        temperature: 1,
        top_p: 0.95,
        max_tokens: 16384,
        chat_template_kwargs: { enable_thinking: true },
        reasoning_budget: 16384
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
