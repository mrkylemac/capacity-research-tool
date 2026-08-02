/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Venue caches and tracker data are read at request time from paths built
  // with process.cwd(), which the file tracer cannot infer. Naming them here
  // guarantees they are bundled into the serverless functions rather than
  // relying on the tracer happening to pick the directory up.
  outputFileTracingIncludes: {
    "/**": ["./src/data/**"],
  },
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
};

export default nextConfig;

