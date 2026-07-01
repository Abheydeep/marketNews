import { test } from "node:test";
import assert from "node:assert";
import { logger } from "./logger.mjs";
import handler from "../api/log.mjs";

test("logger: redacts secrets and formats JSON", () => {
  let output = "";
  const originalWrite = process.stdout.write;
  process.stdout.write = (str) => {
    output += str;
  };

  try {
    logger.info("Test log", { key: "nvapi-secret123", other: "clean-value" });
  } finally {
    process.stdout.write = originalWrite;
  }

  const logObj = JSON.parse(output.trim());
  assert.strictEqual(logObj.message, "Test log");
  assert.strictEqual(logObj.other, "clean-value");
  assert.strictEqual(logObj.key, "[REDACTED_NVIDIA_KEY]");
});

test("api/log handler: accepts POST and logs successfully", async () => {
  const req = {
    method: "POST",
    body: {
      level: "warn",
      message: "Warning test message",
      metadata: "test-meta"
    }
  };

  let statusVal = 0;
  let jsonVal = null;
  const res = {
    status(code) {
      statusVal = code;
      return this;
    },
    json(obj) {
      jsonVal = obj;
      return this;
    },
    setHeader() {}
  };

  let logged = "";
  const originalWrite = process.stdout.write;
  process.stdout.write = (str) => {
    logged += str;
  };

  try {
    await handler(req, res);
  } finally {
    process.stdout.write = originalWrite;
  }

  assert.strictEqual(statusVal, 200);
  assert.ok(jsonVal.ok);
  assert.ok(logged.includes("Warning test message"));
});
