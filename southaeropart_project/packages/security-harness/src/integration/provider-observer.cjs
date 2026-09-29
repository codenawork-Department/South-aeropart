// Observe server-side Stripe HTTP calls without recording URLs, headers or bodies.
const https = require("node:https");
const fs = require("node:fs");
const path = require("node:path");
const original = https.request;
https.request = function (input, ...rest) {
  const host =
    typeof input === "string" || input instanceof URL
      ? new URL(input).hostname
      : input?.hostname || input?.host;
  const request = original.call(this, input, ...rest);
  if (host === "api.stripe.com" && process.env.SECURITY_PROVIDER_DIRECTORY) {
    const file = path.join(
      process.env.SECURITY_PROVIDER_DIRECTORY,
      `${process.pid}.jsonl`,
    );
    request.once("response", (response) =>
      fs.appendFileSync(
        file,
        JSON.stringify({
          provider: "stripe",
          method: request.method,
          status: response.statusCode,
        }) + "\n",
      ),
    );
    request.once("error", () =>
      fs.appendFileSync(
        file,
        JSON.stringify({
          provider: "stripe",
          method: request.method,
          status: null,
        }) + "\n",
      ),
    );
  }
  return request;
};
