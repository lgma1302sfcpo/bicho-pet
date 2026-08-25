/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ["bcryptjs", "libxml2-wasm"],
  typedRoutes: true
};

export default nextConfig;
