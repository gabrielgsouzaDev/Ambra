# Escopo do frontend — Ambra

> Plano derivado do backend real (M0–M7), não de suposição sobre o domínio. O inventário de rotas está
> em `01-inventario.md`; as telas em `02-telas-*.md`; a auditoria de cobertura em `03-cobertura.md`.
>
> **Identidade visual não faz parte deste documento.** Nada aqui define cor, tipografia ou estilo — só
> o que existe, quem acessa e o que consome. A direção visual (retrô / paleta âmbar) entra depois,
> sobre esta estrutura.

## O produto

Sistema pré-pago de cantina escolar. O responsável recarrega o saldo do aluno via PIX; o aluno paga
com um cartão QR impresso no balcão; o responsável vê e controla tudo. Uma escola por instância.

## Público e superfícies

| Superfície | Usuário | Dispositivo | Característica |
|---|---|---|---|
| **Portal Responsável** | pai/mãe | celular (PWA instalável) | uso rápido e esporádico: conferir saldo, recarregar, olhar o extrato |
| **PDV** | operador da cantina | celular/tablet com câmera | uso intenso em 15 min de recreio — cada segundo conta |
| **Admin** | secretaria da escola | desktop | uso pontual e denso: onboarding, cartões, relatórios |

O aluno **não tem tela**: é passivo, identificado pelo cartão QR.

## Modelo de navegação

Três aplicações com navegação própria, **um login só** — o papel define para onde o usuário vai depois
de entrar.

- **Portal (RESPONSAVEL)** — sem menu lateral. Navegação por pilha: lista de dependentes → dependente
  → ação. No mobile, botão de voltar sempre visível. **3 itens** de primeiro nível quando há mais de
  um dependente.
- **PDV (OPERATOR)** — o leitor **é** a tela inicial. Barra inferior com 3 itens: `Vender`,
  `Catálogo`, `Fechamento`. Nada além disso: o operador está com fila na frente.
- **Admin (ADMIN)** — sidebar com **5 itens**: `Início`, `Alunos`, `Cartões`, `Operadores`,
  `Relatório`. `Produtos` entra dentro de `Início` como atalho (o Admin gerencia catálogo, mas quem
  usa no dia a dia é o operador).

Nenhuma superfície tem seleção de tenant — é uma escola por instância.

## Mapa de telas (20)

### Público / Autenticação — 2
| ID | Tela | Rota |
|---|---|---|
| P1 | Entrar | `/entrar` |
| P2 | Ativar conta | `/ativar?token=` |

### Portal Responsável — 6
| ID | Tela | Rota |
|---|---|---|
| R1 | Meus dependentes | `/` |
| R2 | Dependente (saldo + extrato) | `/dependente/:id` |
| R3 | Recarregar — valor | `/dependente/:id/recarregar` |
| R4 | Recarregar — pagamento PIX | `/dependente/:id/recarregar/pagar` |
| R5 | Controles do dependente | `/dependente/:id/controles` |
| R6 | Confirmar bloqueio do cartão *(modal)* | — |

### PDV Operador — 5
| ID | Tela | Rota |
|---|---|---|
| O1 | Vender — leitor de cartão | `/` |
| O2 | Vender — pedido | `/venda/:studentId` |
| O3 | Buscar por RM *(modal)* | — |
| O4 | Catálogo da cantina | `/catalogo` |
| O5 | Fechamento do dia | `/fechamento` |

### Admin — 7
| ID | Tela | Rota |
|---|---|---|
| A1 | Início | `/` |
| A2 | Alunos | `/alunos` |
| A3 | Aluno (detalhe) | `/alunos/:id` |
| A4 | Cadastrar aluno | `/alunos/novo` |
| A5 | Importar CSV | `/importar` |
| A6 | Cartões | `/cartoes` |
| A7 | Operadores | `/operadores` |

**O4 (Catálogo) e O5 (Fechamento) são compartilhados** entre PDV e Admin — mesmos endpoints, mesmos
papéis autorizados. Decisão consciente: duplicar a tela só mudaria o menu ao redor.

## Contagem

- **20 telas** — 18 com rota própria + 2 modais.
- **34 endpoints** no backend · **31 cobertos** · **3 de uso interno** · **0 órfãos**.
- **9 lacunas de backend** identificadas (ver `03-cobertura.md`), das quais **3 bloqueiam experiência
  básica** e deveriam ser resolvidas antes do piloto.

## Ordem sugerida de construção

1. **P1 + P2** (entrar e ativar) — sem isso nada é acessível.
2. **O1 + O2 + O3** (o PDV) — é o coração e o que precisa ser testado numa cantina real.
3. **R1 + R2** (dependentes e extrato) — o valor que o pai enxerga.
4. **A2 + A3 + A4 + A5 + A6** (onboarding) — o que coloca a escola no ar.
5. **R3 + R4 + R5** (recarga e controles) — dependem do gateway real estar escolhido.
6. **O4 + O5 + A1 + A7** (catálogo, fechamento, início, operadores).
