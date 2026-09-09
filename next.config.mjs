/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ["bcryptjs", "libxml2-wasm"],
  outputFileTracingIncludes: {
    "/*": [
      "./resources/fiscal/schemas/pl-010e-v1.02/PL_010e_v1.02/NFe/*.xsd",
      "./resources/fiscal/ca/*.pem"
    ]
  },
  typedRoutes: true
};

export default nextConfig;
