# Domine Stack

Módulo isolado contendo as definições de base da plataforma "Domine" no tenant `LOJACOND`.
Este módulo expõe capabilities, modelos (Zod + TS), eventos estruturados e um *Connector Kit* base.

## Regras
1. **Sem acoplamento forte**: Nenhuma dependência com `/app` ou componentes frontend aqui.
2. **Uso isolado**: Este módulo define os contratos que serão implementados por adaptadores e consumidos pela API.
