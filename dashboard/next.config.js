/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Allow the API route to read from the parent directory (where .cli_explainer.db lives)
  // Set CLI_EXPLAINER_DB env var to override the path
  env: {
    CLI_EXPLAINER_DB: process.env.CLI_EXPLAINER_DB || "",
  },
};

module.exports = nextConfig;
