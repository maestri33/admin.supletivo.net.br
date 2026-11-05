---
version: alpha
name: admin.supletivo.net.br-design
description: "Design system specification for admin.supletivo.net.br (Internal Operations, Matricula Auditing & Compliance Dashboard). Pátria Amada Refinada palette optimized for high-density data tables, verification queues, and audit trail readability."

colors:
  primary: "#002776"           # Blue institutional authority as primary action
  on-primary: "#ffffff"
  primary-hover: "#001a52"
  accent: "#ffc400"            # Yellow conversion for urgent alerts and primary CTAs
  on-accent: "#0b1220"
  canvas: "#f8fafc"            # Cool paper gray for long hours of administrative reading
  canvas-dark: "#0b1220"       # Night mode background
  surface-card: "#ffffff"      # Data panels and table containers
  surface-row-hover: "#f1f5f9" # Data row hover highlight
  hairline: "#e2e8f0"          # Crisp 1px table borders
  ink: "#0b1220"               # Text primary (deep black)
  muted: "#64748b"             # Secondary metadata & table column headers
  brand-green: "#00734d"       # Approved registration & MEC compliance
  brand-blue: "#002776"        # Active filters & system identity
  semantic-danger: "#b91c1c"   # Fraud flag, rejected document
  semantic-danger-bg: "#fee2e2"
  semantic-success: "#15803d"  # Validated registration, approved diploma
  semantic-success-bg: "#dcfce7"
  semantic-warning: "#92400e"  # Pending review queue
  semantic-warning-bg: "#fef3c7"
  semantic-info: "#0369a1"     # System notes & partner webhook triggers
  semantic-info-bg: "#e0f2fe"

typography:
  display:
    fontFamily: "Archivo Black, system-ui, sans-serif"
    fontWeight: 400
    lineHeight: 1.10
  body:
    fontFamily: "Inter, system-ui, -apple-system, sans-serif"
    fontWeight: 400
    lineHeight: 1.45
  table-header:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 600
    textTransform: "uppercase"
    letterSpacing: "0.05em"
  mono:
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
    fontSize: "13px"

rounded:
  sm: 4px
  input: 8px
  card: 12px
  pill: 999px

spacing:
  table-cell-padding-y: "10px"
  table-cell-padding-x: "16px"
---

# Design System — `admin.supletivo.net.br`

## 1. Princípios de Interface Administrativa
1. **Densidade e Eficiência Operacional**: Operadores analisam dezenas de matrículas e documentos por hora. A interface prioriza máxima visibilidade de dados com rolagem suave, tipografia nítida e ausência de vazios desnecessários.
2. **Identificação Visual Instantânea (Color Coding Auditado)**: O operador deve bater o olho e distinguir imediatamente documentos pendentes (amarelo), aprovados (verde) ou recusados (vermelho), com contraste WCAG AA rigoroso.
3. **Precisão Monospaçada para Identificadores**: CPFs, IDs de Matrícula, números de protocolo e chaves de pagamento Pix utilizam fonte mono (`ui-monospace`) com espaçamento regular para conferência sem erros visuais.

## 2. Componentes de Auditoria e Gestão

### Tabela de Matrículas e Documentos
- **Linha de Dados**: Altura equilibrada (padding vertical de 10px), fundo branco, com destaque suave ao passar o mouse (`#f1f5f9`).
- **Separadores**: Hairline sutil de 1px em `#e2e8f0`.
- **Badges de Status**: Formato pílula compacto com texto em peso 600 e fundo pastel semântico correspondente.

### Painel de Conferência de Documentos (Split-View)
- **Lado Esquerdo**: Dados cadastrais do aluno, CPF e validação no SISTEC/MEC.
- **Lado Direito**: Visualizador integrado de PDF/Imagem do documento original com controles de zoom e rotação.
- **Barra de Ação Fixa Inferior**: Botões de ação rápida (`Aprovar Documento`, `Recusar com Justificativa`) sempre acessíveis.

### Barra de Filtros e Busca Rápida
- **Campos**: Altura ergonômica de 40px, anel de foco em `--blue` institucional.
- **Filtros Rápidos**: Chips clicáveis (Todos, Pendentes de Análise, Recusados, Pagos) com contadores em tempo real.
