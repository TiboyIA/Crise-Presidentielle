// Adds runtime config the rest of app.json can't express.
// REPLIT_DOMAINS is the comma-separated list of public domains for this
// repl. The Expo bundle is served on a different subdomain than the API
// server, so the client must call the API at the absolute https URL of
// the first REPLIT_DOMAINS entry (which routes /api through the shared
// reverse proxy to the API server).
const raw = process.env.REPLIT_DOMAINS;
const apiHost = typeof raw === "string" && raw.length > 0 ? raw.split(",")[0] : null;

module.exports = ({ config }) => ({
  ...config,
  extra: {
    ...(config.extra ?? {}),
    apiHost,
  },
});
