import path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    optimizeCss: false,
  },
  // Monorepo (multiple lockfiles) — make tracing root explicit.
  outputFileTracingRoot: path.join(__dirname, ".."),
}

export default nextConfig
