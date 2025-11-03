/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    // Fix for canvas module in react-pdf
    if (isServer) {
      config.resolve.alias.canvas = false;
      config.resolve.alias.encoding = false;
    }
    
    return config;
  },
  // Turbopack configuration
  turbopack: {
    resolveAlias: {
      canvas: './empty-module.js',
    },
  },
};

module.exports = nextConfig;
