/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Emits a self-contained server bundle in .next/standalone so the Docker
  // image used for the Fly deploy does not need node_modules.
  output: "standalone",
  // Venue caches and tracker data are read at request time from paths built
  // with process.cwd(), which the file tracer cannot infer. Naming them here
  // guarantees they land in the standalone output instead of relying on the
  // tracer happening to pick the directory up.
  outputFileTracingIncludes: {
    "/**": ["./src/data/**"],
  },
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
};

export default nextConfig;

