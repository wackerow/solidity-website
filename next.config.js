/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'export',
  experimental: { esmExternals: true },
  basePath: 'solidity-website',
  images: { unoptimized: true },
}

const removeImports = require('next-remove-imports')()
module.exports = removeImports(nextConfig)
