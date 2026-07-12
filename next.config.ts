import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
  },
  // ============================================================
  // ✅ AGREGAR: Variables de entorno para el build
  // ============================================================
  env: {
    NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
    NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
    NEXT_PUBLIC_FIREBASE_DATABASE_URL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || '',
  },
  
  // ============================================================
  // ✅ AGREGAR: Optimizaciones para el build
  // ============================================================
  swcMinify: true,
  compress: true,
  
  // ============================================================
  // ✅ AGREGAR: Configuración para Firebase
  // ============================================================
  webpack: (config, { isServer }) => {
    // Ignorar módulos de Firebase durante el build si no hay variables
    if (!process.env.NEXT_PUBLIC_FIREBASE_API_KEY) {
      config.resolve.alias = {
        ...config.resolve.alias,
        'firebase/app': false,
        'firebase/auth': false,
        'firebase/firestore': false,
        'firebase/database': false,
      };
    }
    return config;
  },
};

export default nextConfig;