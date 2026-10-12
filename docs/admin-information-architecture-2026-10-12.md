# Admin information architecture cleanup

## Findings

The admin had nine peer navigation items and repeated the same destinations in
the cockpit as a large module grid. This made operational work compete with
technical configuration. `Treinamento & LMS` was still a first-class item even
though training is deferred from the current product version. `Notificações &
TTS` exposed infrastructure concerns beside human operations. The dashboard
also rendered the backend's `db_ok` field through a stale `database` client type,
so a healthy database appeared as `Indisponível`.

## Current structure

- **Operação:** Visão Geral, Pessoas, Revisões, Rede.
- **Dinheiro:** Financeiro, Regras comerciais.
- **Sistema:** Mensagens, Auditoria.

Training remains reachable at its existing route for later work, but it no longer
competes for attention in the current release. The cockpit now contains four live
decision links and metrics rather than a duplicate catalog of every page.

## Product truth retained

The admin still supports the existing live API-backed tasks: document decisions,
people and enrollment lookup, hubs/coordinators, prices, finance, notification
history/templates, and system/audit status. No API endpoints or data mutations
were removed. This pass changes hierarchy and labels only, except for correcting
the `SystemStatusOut` client contract to accept the actual `db_ok` response.

## Release gates

- Astro check and build must pass.
- Existing admin unit tests must pass.
- Manual production smoke: staff login, dashboard metrics, each six primary
  destinations, modal scroll, and no-training item in primary nav.
- Review later: split notification template editing from technical TTS details;
  add a dedicated enrollment operations view only after the backend exposes the
  required endpoint and actions.
