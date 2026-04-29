import http from "node:http";
import { createDemoApp } from "./demo-app.mjs";

const requestedPort = Number(readArg("--port") ?? process.env.PORT ?? 4173);
const testMode = process.argv.includes("--test-mode");
const app = await createDemoApp();

const server = http.createServer(async (request, response) => {
  try {
    const body = await readBody(request);
    const result = await app.request(request.method ?? "GET", request.url ?? "/", body);
    response.writeHead(result.status, result.headers);
    response.end(result.body);
  } catch (error) {
    response.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
    response.end(JSON.stringify({ error: error.message }));
  }
});

listen(requestedPort);

async function readBody(request) {
  const chunks = [];
  for await (const chunk of request) {
    chunks.push(chunk);
  }
  const text = Buffer.concat(chunks).toString("utf8");
  return text ? JSON.parse(text) : {};
}

function listen(port) {
  server.once("error", (error) => {
    if (error.code === "EADDRINUSE" && port !== 0) {
      listen(port + 1);
      return;
    }
    throw error;
  });
  server.listen(port, "127.0.0.1", () => {
    const address = server.address();
    const actualPort = typeof address === "object" && address ? address.port : port;
    const message = testMode
      ? JSON.stringify({ port: actualPort })
      : `Market Narrative demo running at http://localhost:${actualPort}`;
    process.stdout.write(`${message}\n`);
  });
}

function readArg(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : process.argv[index + 1];
}
