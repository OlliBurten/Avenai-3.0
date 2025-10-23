/** @type {import('next').NextConfig} */
const nextConfig = {
  // Performance optimizations
  serverExternalPackages: ['@prisma/client', 'openai'],
  outputFileTracingRoot: __dirname,
  
  // Experimental features for better performance
  experimental: {
    optimizePackageImports: ['@radix-ui/react-icons', 'lucide-react', '@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
    // instrumentationHook: true, // No longer needed in Next.js 15
  },
  
  // Webpack configuration
  webpack: (config, { isServer, dev }) => {
    // Fix self reference issues
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    }
    
    // Ensure pdf-parse and other problematic libraries are never packed into client bundles
    if (!isServer) {
      config.externals = config.externals || []
      config.externals.push({ 'pdf-parse': 'commonjs2 pdf-parse' })
    }
    
    
    // Optimize bundle size
    if (!dev) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              chunks: 'all',
            },
            common: {
              name: 'common',
              minChunks: 2,
              chunks: 'all',
              enforce: true,
            },
          },
        },
      }
    }
    
    return config
  },
  
  // Image optimization
  images: {
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  
  // Compression
  compress: true,
  
  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ]
  },
  
  // Redirects for SEO
  async redirects() {
    return [
      {
        source: '/docs',
        destination: '/',
        permanent: true,
      },
    ]
  },
  
  
  // TypeScript configuration
  typescript: {
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    ignoreBuildErrors: true,
  },
  
  // ESLint configuration
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  
  // Output configuration
  output: 'standalone',
  
  // Skip static generation to avoid build-time issues
  // All pages will be server-rendered (fine for authenticated SaaS)
  generateBuildId: async () => {
    return `build-${Date.now()}`;
  },
  
  // Trailing slash
  trailingSlash: false,
  
  // PoweredByHeader
  poweredByHeader: false,
  
  // React strict mode
  reactStrictMode: true,
  
  // SWC minification is enabled by default in Next.js 13+
}

module.exports = nextConfig
