import { logger } from "../tools/logger.mjs";

export const config = { runtime: "nodejs", regions: ["bom1"] };

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(455).json({ ok: false, error: "method_not_allowed" });
  }

  try {
    let body = "";
    if (typeof request.body === "string") {
      body = JSON.parse(request.body);
    } else if (request.body && typeof request.body === "object") {
      body = request.body;
    } else {
      const buffers = [];
      for await (const chunk of request) {
        buffers.push(chunk);
      }
      body = JSON.parse(Buffer.concat(buffers).toString("utf8"));
    }

    const { level = "error", message = "Client error", ...meta } = body;
    const logMethod = level === "warn" ? "warn" : level === "error" ? "error" : "info";
    
    logger[logMethod](message, {
      source: "client",
      ...meta
    });

    return response.status(200).json({ ok: true, status: "logged" });
  } catch (err) {
    logger.error("Client log ingestion failure", { error: err.message });
    return response.status(400).json({ ok: false, error: "malformed_payload" });
  }
}
