import type { Metadata } from "next";
import { TopBar } from "@/components/ui/TopBar";
import { GroupedSection, SectionDivider } from "@/components/ui/GroupedSection";
import { SettingsRow } from "@/components/ui/SettingsRow";
import { ValueRow } from "@/components/ui/ValueRow";
import { DangerRow } from "@/components/ui/DangerRow";
import { ThemeToggleSection } from "./_components/ThemeToggleSection";
import { HapticToggleSection } from "./_components/HapticToggleSection";

export const metadata: Metadata = {
  title: "Configurações — Condstore OS",
};

/* ── Ícones inline (outline, stroke 1.5) ─────────────────── */

const UserIcon = () => (
  <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const CreditCardIcon = () => (
  <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <rect width="20" height="14" x="2" y="5" rx="2" />
    <line x1="2" x2="22" y1="10" y2="10" />
  </svg>
);

const ZapIcon = () => (
  <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
);

const PlugIcon = () => (
  <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M12 22v-5" />
    <path d="M9 8V2" />
    <path d="M15 8V2" />
    <path d="M18 8H6a2 2 0 0 0-2 2v3a8 8 0 0 0 16 0v-3a2 2 0 0 0-2-2Z" />
  </svg>
);

const ShieldIcon = () => (
  <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

const SunMoonIcon = () => (
  <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M12 8a2.83 2.83 0 0 0 4 4 4 4 0 1 1-4-4" />
    <path d="M12 2v2" />
    <path d="M12 20v2" />
    <path d="m4.9 4.9 1.4 1.4" />
    <path d="m17.7 17.7 1.4 1.4" />
    <path d="M2 12h2" />
    <path d="M20 12h2" />
    <path d="m6.3 17.7-1.4 1.4" />
    <path d="m19.1 4.9-1.4 1.4" />
  </svg>
);

const MicIcon = () => (
  <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
    <line x1="12" x2="12" y1="19" y2="22" />
  </svg>
);

const LockIcon = () => (
  <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const LinkIcon = () => (
  <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </svg>
);

/* ── Página ───────────────────────────────────────────────── */

export default function SettingsPage() {
  return (
    <>
      <TopBar
        title="Configurações"
        leftAction={
          <a
            href="/cockpit"
            aria-label="Voltar ao Cockpit"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              color: "var(--os-accent)",
              textDecoration: "none",
              fontSize: "var(--os-font-body)",
              fontWeight: 400,
              padding: "0 4px",
            }}
          >
            <svg width={10} height={16} viewBox="0 0 10 16" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M9 1 1 8l8 7" />
            </svg>
            Cockpit
          </a>
        }
        rightAction={
          <button
            type="button"
            aria-label="Informações sobre as configurações"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--os-accent)",
              display: "flex",
              alignItems: "center",
              padding: "0 4px",
            }}
          >
            <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4" />
              <path d="M12 8h.01" />
            </svg>
          </button>
        }
      />

      <main
        style={{
          maxWidth: 680,
          margin: "0 auto",
          padding: "24px var(--os-row-padding) 48px",
        }}
      >
        {/* Perfil */}
        <GroupedSection title="Perfil">
          <SettingsRow
            label="Minha Conta"
            icon={<UserIcon />}
            rightValue="Administrador"
            href="#"
            aria-label="Configurações da minha conta"
          />
        </GroupedSection>

        {/* Cobrança */}
        <GroupedSection title="Cobrança">
          <SettingsRow
            label="Plano e Assinatura"
            icon={<CreditCardIcon />}
            rightValue="Plano Pro"
            href="#"
            aria-label="Ver plano e assinatura"
          />
          <SectionDivider />
          <SettingsRow
            label="Histórico de Faturas"
            icon={<CreditCardIcon />}
            href="#"
            aria-label="Ver histórico de faturas"
          />
        </GroupedSection>

        {/* Recursos */}
        <GroupedSection title="Recursos">
          <SettingsRow
            label="LLM Orchestrator"
            icon={<ZapIcon />}
            rightValue="Modo B"
            href="#"
            aria-label="Configurações do LLM Orchestrator"
          />
          <SectionDivider />
          <SettingsRow
            label="Allowlist de Tools"
            icon={<ZapIcon />}
            href="#"
            aria-label="Gerenciar allowlist de ferramentas do LLM"
          />
        </GroupedSection>

        {/* Conectores */}
        <GroupedSection title="Conectores">
          <SettingsRow
            label="Transportadoras"
            icon={<PlugIcon />}
            rightValue="Melhor Envio"
            href="#"
            aria-label="Configurar transportadoras"
          />
          <SectionDivider />
          <SettingsRow
            label="Mensageria (WhatsApp)"
            icon={<PlugIcon />}
            rightValue="Twilio"
            href="#"
            aria-label="Configurar integração de mensageria"
          />
          <SectionDivider />
          <SettingsRow
            label="Pagamento"
            icon={<PlugIcon />}
            rightValue="— (pendente)"
            href="#"
            aria-label="Configurar integração de pagamento"
          />
        </GroupedSection>

        {/* Permissões */}
        <GroupedSection title="Permissões">
          <SettingsRow
            label="Equipe e Acessos"
            icon={<ShieldIcon />}
            href="#"
            aria-label="Gerenciar equipe e acessos"
          />
          <SectionDivider />
          <SettingsRow
            label="Papéis (Roles)"
            icon={<ShieldIcon />}
            href="#"
            aria-label="Configurar papéis e permissões"
          />
        </GroupedSection>

        {/* Aparência */}
        <ThemeToggleSection />

        {/* Idioma da fala */}
        <GroupedSection title="Idioma da fala">
          <ValueRow
            label="Idioma"
            value="PT-BR"
            href="#"
            aria-label="Alterar idioma da fala"
          />
        </GroupedSection>

        {/* Privacidade */}
        <GroupedSection title="Privacidade" footer="Dados pessoais são mascarados nos logs de auditoria conforme a política de privacidade.">
          <SettingsRow
            label="Política de Privacidade"
            icon={<LockIcon />}
            href="#"
            aria-label="Ler política de privacidade"
          />
          <SectionDivider />
          <SettingsRow
            label="Logs de Auditoria"
            icon={<LockIcon />}
            href="#"
            aria-label="Ver logs de auditoria"
          />
        </GroupedSection>

        {/* Links compartilhados */}
        <GroupedSection title="Links compartilhados">
          <SettingsRow
            label="Gerenciar Links"
            icon={<LinkIcon />}
            href="#"
            aria-label="Gerenciar links compartilhados"
          />
        </GroupedSection>

        {/* Feedback háptico */}
        <HapticToggleSection />

        {/* Aparência: Idioma da voz */}
        <GroupedSection title="Sobre">
          <ValueRow
            label="Versão"
            value="0.1.0-scaffold"
            chevron={false}
            aria-label="Versão do Condstore OS"
          />
          <SectionDivider />
          <SettingsRow
            label="Documentação"
            icon={<LinkIcon />}
            href="#"
            aria-label="Abrir documentação"
          />
        </GroupedSection>

        {/* Sair */}
        <GroupedSection>
          <DangerRow
            label="Sair da conta"
            href="/api/auth/logout"
            aria-label="Sair da conta"
          />
        </GroupedSection>
      </main>
    </>
  );
}
