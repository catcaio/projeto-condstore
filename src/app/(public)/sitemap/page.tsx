import { Metadata } from 'next';
import { ArchitectureExplorer } from '@/ui/sitemap/architecture-explorer';

export const metadata: Metadata = {
  title: 'Arquitetura & Sitemap Interativo | CONDSTORE OS',
  description: 'Aplicação web interativa de exploração e visualização em tempo real da arquitetura do CONDSTORE OS.',
};

export default function SitemapPage() {
  return <ArchitectureExplorer />;
}
