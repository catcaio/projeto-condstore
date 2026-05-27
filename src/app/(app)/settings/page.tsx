import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Configurações — Condstore OS',
};

export default function SettingsRedirect() {
  redirect('/configuracoes');
}
