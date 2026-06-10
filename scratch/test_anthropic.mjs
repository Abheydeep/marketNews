const anthropicApiKey = process.env.ANTHROPIC_API_KEY;

const prompt = "Select the most important items from: [0] Dog barks, [1] Fed cuts rates, [2] Cat meows. Return a JSON array of the IDs.";

async function run() {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": anthropicApiKey,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: "claude-3-haiku-20240307",
      max_tokens: 1000,
      system: "You are a pre-market desk editor. Return a JSON array of indices. Example output: [0, 1, 2]",
      messages: [
        { role: "user", content: prompt }
      ]
    })
  });
  const data = await response.json();
  console.log(JSON.stringify(data, null, 2));
}

run();
