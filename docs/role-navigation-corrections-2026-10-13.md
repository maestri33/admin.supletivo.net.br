# Correções de navegação administrativa — 2026-10-13

## Implementação local

- Quatro espaços: Alunos, Promotores, Polos e Administrador.
- Dock contextual inferior com reserva de espaço e safe area.
- Alunos: Leads, Matrículas, Ativos e Documentos.
- Leads: lista de propostas pendentes, dados captados, promotor, polo, coordenador e contatos WhatsApp vindos do backend. Detalhe da proposta e cobrança.
- Edição de preço exclusivamente para proposta sem cobrança. Cobrança emitida ou paga recebe bloqueio no servidor. Pix, parcela e quantidade de parcelas são enviados para a API de staff.
- Promotores: consulta e acesso à revisão documental existente.
- Polos: lista e Novo polo. O link Novo abre o modal existente. Seleção/troca de coordenador utiliza a API existente de promotores aptos.
- Administrador: visão geral/saldo, preços/comissões, pagamentos, infraestrutura e notificações.
- Infraestrutura: acesso aos painéis Cloudflare e Azure. Links não significam monitoramento integrado. Estados inexistentes de cache/banco não são apresentados como saudáveis.

## Evidências técnicas

- `npm run check`: zero erros/avisos.
- `npm run build`: concluído.
- Backend: suíte completa, 909 testes aprovados; após ajuste do bloqueio na emissão da cobrança, 78 testes de matrícula e propostas aprovados.

## Limites e release

Sem deploy nesta execução. Há mudanças paralelas em autenticação/navegação no workspace; foi solicitado estabilizar o trabalho do Antigravity antes de montar release. Não há homologação visual nem smoke em produção destas mudanças.

Ordem de publicação: backend (contratos e bloqueio de valores), admin e app. Incrementar versão global pelo oráculo na entrega; registrar versões implantadas, smoke autenticado e rollback antes de declarar disponibilidade.

APIs novas: `GET /api/v1/staff/leads/{external_id}` e `PUT /api/v1/staff/leads/{external_id}/pricing`. Corpo de edição: `pix`, `card_installment`, `card_installments`. Apenas superusuário. A tentativa de alterar cobrança existente retorna `LEAD_PRICING_LOCKED`.

Mudanças futuras em proposta com cobrança existente exigem fluxo explícito de substituição/cancelamento no provedor. Esta entrega preserva os valores já emitidos, conforme a regra comercial definida pelo usuário.
