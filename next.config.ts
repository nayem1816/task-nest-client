import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Stop `next dev` from writing AGENTS.md / CLAUDE.md into the repository.
  agentRules: false,
};

export default nextConfig;
