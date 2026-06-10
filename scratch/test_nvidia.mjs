const apiKey = process.env.NVIDIA_API_KEY;
const model = "meta/llama-3.1-70b-instruct";
const baseUrl = "https://integrate.api.nvidia.com/v1";

const prompt = "You are a pre-market desk editor. Select the most important market-moving articles from the following list. Exclude noise, generic opinion pieces, and non-market news. Return a JSON array of the IDs (indices) of the selected articles. Example output: [0, 3, 5]";
const inputList = "[0] Fed cuts rates\n[1] Dog barks\n[2] Reliance posts record profit";

async function run() {
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: prompt },
        { role: "user", content: inputList }
      ],
      response_format: { type: "json_object" }
    })
  });
  
  const data = await response.json();
  console.log(JSON.stringify(data, null, 2));
}

run();
