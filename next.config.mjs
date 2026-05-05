/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  // next 14: this key is "experimental.serverComponentsExternalPackages"
  experimental: {
    serverComponentsExternalPackages: ["@anthropic-ai/sdk", "pdf-parse", "mammoth"],
  },
};

export default nextConfig;
