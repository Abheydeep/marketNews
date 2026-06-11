// tools/run-move-detect.mjs
// Simple script to invoke the move-detect API handler locally for testing.

import handler from "../api/move-detect.mjs";

process.env.CRON_SECRET ||= "local-move-detect-secret";

// Minimal mock request/response compatible with Vercel's API.
const mockRequest = {
  method: "GET",
  headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
  query: {},
};

const mockResponse = {
  _status: 200,
  _body: null,
  setHeader(name, value) {
    // ignore for now
  },
  status(code) {
    this._status = code;
    return this;
  },
  json(obj) {
    this._body = obj;
    console.log("Response status:", this._status);
    console.log("Response body:", JSON.stringify(obj, null, 2));
    return this;
  },
};

// Invoke the handler.
await handler(mockRequest, mockResponse);
