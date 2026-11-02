/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: process.env.NEXT_DIST_DIR || '.next',
  typescript: {
    tsconfigPath: './tsconfig.build.json',
  },
  async redirects() {
    return [
      // Aliases históricos direcionados para o destino canônico final (sem chaining)
      {
        source: '/produtos/crm',
        destination: '/produto',
        permanent: true,
      },
      {
        source: '/produtos/envios',
        destination: '/produto',
        permanent: true,
      },
      {
        source: '/plataforma/cockpit',
        destination: '/produto',
        permanent: true,
      },
      // Consolidação de rotas públicas legadas redundantes para o ecossistema único
      {
        source: '/crm-whatsapp',
        destination: '/produto',
        permanent: true,
      },
      {
        source: '/logistica-pedidos',
        destination: '/produto',
        permanent: true,
      },
      {
        source: '/cockpit-gerencial',
        destination: '/produto',
        permanent: true,
      },
      {
        source: '/plataforma',
        destination: '/produto',
        permanent: true,
      },
      {
        source: '/tecnologias',
        destination: '/produto',
        permanent: true,
      },
      {
        source: '/solucoes',
        destination: '/produto',
        permanent: true,
      },
      {
        source: '/implantacao',
        destination: '/como-funciona',
        permanent: true,
      },
      {
        source: '/integracoes',
        destination: '/produto',
        permanent: true,
      },
      {
        source: '/showcase',
        destination: '/produto',
        permanent: true,
      },
      {
        source: '/valores',
        destination: '/produto',
        permanent: true,
      },
      {
        source: '/gargalos-logisticos',
        destination: '/como-funciona',
        permanent: true,
      },
      {
        source: '/proof',
        destination: '/como-funciona',
        permanent: true,
      },
    ];
  },
  async headers() {
    const csp = [
      "default-src 'self'",
      "base-uri 'self'",
      "frame-ancestors 'none'",
      "object-src 'none'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data: https:",
      "connect-src 'self' https: http: ws: wss:",
      "frame-src 'none'",
    ].join('; ');

    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: csp },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
        ],
      },
    ];
  },
};

export default nextConfig;
