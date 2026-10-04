import type { NextConfig } from 'next';
import { parseServerEnv } from './src/lib/env';

const { API_ORIGIN } = parseServerEnv({ API_ORIGIN: process.env.API_ORIGIN });

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Stop `next dev` from writing AGENTS.md / CLAUDE.md into the repository.
  agentRules: false,
  // The browser talks to the API through this origin, so the refresh cookie is
  // first-party and no CORS preflight is needed for the app's own requests.
  async rewrites() {
    return [{ source: '/api/v1/:path*', destination: `${API_ORIGIN}/api/v1/:path*` }];
  },
};

export default nextConfig;
