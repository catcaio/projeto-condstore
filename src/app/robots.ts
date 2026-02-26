import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://lojacond.com.br';

    return {
        rules: {
            userAgent: '*',
            allow: ['/', '/pricing', '/docs', '/login'],
            disallow: ['/cockpit/', '/api/', '/billing/', '/evolution/'],
        },
        sitemap: `${baseUrl}/sitemap.xml`,
    };
}
