# Funil de pilotos

Funil simples para acompanhar a ativação dos primeiros pilotos sem criar CRM paralelo fora do repositório.

Regra: um lead só avança quando cumprir o critério de saída da etapa atual.

| Etapa | Critério de entrada | Critério de saída |
|---|---|---|
| Lead identificado | Empresa entrou na lista de prospecção com segmento, cidade e motivo de fit definidos | Canal e decisor inicial mapeados para primeiro contato |
| Contato realizado | Primeiro contato enviado por LinkedIn, WhatsApp, e-mail ou telefone | Houve resposta do lead ou tentativa registrada com data e próximo follow-up |
| Respondeu | Lead respondeu qualquer mensagem ou ligação | Próxima conversa marcada ou dor operacional mínima entendida |
| Qualificado | Confirmado que a empresa vende pelo WhatsApp, tem operação manual e problema real de cotação/pedido | Decisor ou operador-chave aceitou ver a demo e data ficou proposta |
| Demo agendada | Data e horário da demo combinados | Convite enviado e presença confirmada pelo lead |
| Demo realizada | Demo executada com decisor ou operador responsável presente | Próximo passo definido: piloto proposto, no-fit ou follow-up com prazo |
| Piloto proposto | Escopo do piloto, prazo e faixa comercial apresentados | Cliente aceitou avançar, pediu ajustes objetivos ou recusou formalmente |
| Piloto fechado | Há acordo sobre escopo, responsável do cliente, prazo do piloto e data de início | Kickoff de onboarding marcado e checklist de dados disparado |
| Onboarding iniciado | Cliente recebeu coleta de dados e cronograma de setup | Dados mínimos enviados e setup técnico entrou em execução |
| Piloto ativo | Cliente já está operando com onboarding iniciado e uso real do produto | Sai desta etapa apenas para revisão de 30 dias, expansão ou encerramento |

---

## Regras de passagem

- Se a demo acontecer sem decisor ou operador dono do processo, não considerar `Demo realizada` como concluída para proposta.
- Se o lead sumir por mais de 7 dias após resposta, manter no estágio atual e registrar risco.
- Se o cliente pedir integração com ERP ou automação total como condição de entrada, marcar como no-fit e não empurrar proposta.
- Se a proposta não tiver data de onboarding, o lead ainda não está em `Piloto fechado`.
