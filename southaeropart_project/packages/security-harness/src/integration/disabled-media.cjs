// Guest HTTPS verification does not exercise media. Reject attempts to call the
// real media provider; the isolated configuration cannot upload/delete assets.
function check(input) {
  const host =
    typeof input === "string" || input instanceof URL
      ? new URL(input).hostname
      : input?.hostname || input?.host || "";
  if (/(^|\.)cloudinary\.com(?::\d+)?$/.test(host)) {
    throw new Error("Media provider is disabled in the isolated cookie test");
  }
}
const https = require("node:https");
for (const key of ["request", "get"]) {
  const original = https[key];
  https[key] = function (input, ...rest) {
    check(input);
    return original.call(this, input, ...rest);
  };
}
const fetch = globalThis.fetch;
globalThis.fetch = function (input, ...rest) {
  check(input instanceof Request ? input.url : input);
  return fetch.call(this, input, ...rest);
};
