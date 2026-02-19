"use client";

import { GroupedSection } from "@/components/ui/GroupedSection";
import { ToggleRow } from "@/components/ui/ToggleRow";

/**
 * Seção de feedback háptico (toggle placeholder).
 * Componente cliente para gerenciar estado local.
 * Sem implementação real de vibração — apenas scaffolding.
 */
export function HapticToggleSection() {
  return (
    <GroupedSection footer="O feedback háptico está disponível apenas em dispositivos compatíveis.">
      <ToggleRow
        label="Feedback háptico"
        defaultChecked={false}
        aria-label="Ativar ou desativar feedback háptico"
      />
    </GroupedSection>
  );
}
