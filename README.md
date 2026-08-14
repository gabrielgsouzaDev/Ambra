# Ambra 🍔💳

> Sistema **pré-pago de cantina escolar** (cashless closed-loop): o responsável recarrega o saldo do aluno via PIX, o aluno paga com um **cartão QR** no balcão, e o responsável **vê e controla** tudo.

**Não é uma fintech.** É um sistema de saldo fechado de cantina — simples, local, e focado.

`status: backend do MVP completo (M0–M7) · 76 testes · 0 vulnerabilidades · escopo do frontend definido, implementação não iniciada`

---

## O que resolve

- **Pais:** veem o que o filho consome, definem limite diário, bloqueiam itens, e a criança **sem celular** compra sem andar com dinheiro.
- **Cantina:** acaba a fila do recreio, o troco, o furto e o "print falso" de PIX.
- **Escola:** um argumento de modernidade e segurança pra oferecer aos pais.

---

## Como funciona (fluxo do cartão QR)

```
Recarga (pai, PIX)  →  Cartão QR (aluno)  →  Balcão (operador escaneia)
                                                     │
                        mostra saldo + limite  →  monta pedido  →  "Liberado"
                                                     │
                              débito atômico do saldo  →  extrato (pai)
```

- **Identificação:** cartão QR impresso (sem app de aluno, sem celular).
- **Recarga:** só PIX remoto, com taxa fixa de **R$ 1,99** por recarga.
- **Segurança:** saldo nunca negativo (garantido no banco); limite diário limita qualquer estrago; bloqueio/reemissão de cartão.

---

## Status dos módulos (backend)

| # | Módulo | O que faz | |
|---|---|---|---|
| M0 | Fundação & Auth | Login JWT + bcrypt, papéis (Admin/Operador/Responsável), guards globais, flag `PAGAMENTOS_ATIVOS` | ✅ |
| M1 | Contas & Identidade | Alunos, responsáveis (1–2 por aluno), cartão QR (token opaco), convite/ativação | ✅ |
| M2 | Admin / Onboarding | Importação CSV, cartões em PDF, envio/reenvio de convite, bloqueio/reemissão de cartão | ✅ |
| M3 | Carteira & Recarga | Saldo em centavos, recarga PIX atrás da porta `PaymentGateway`, crédito **idempotente** por webhook | ✅ |
| M4 | Catálogo | Produtos, toggle disponível/indisponível, bloqueio por produto/aluno (o "X") | ✅ |
| M5 | **PDV / Débito** | Leitura do QR, **débito atômico à prova de concorrência** (sem double-spend), conta de operador | ✅ |
| M6 | Portal Responsável | Dependentes, extrato, limiar de alerta, pedido de bloqueio do cartão | ✅ |
| M7 | Relatório & Fechamento | Fechamento diário da cantina (total, nº de compras, ticket médio, por produto) | ✅ |

**Núcleo `recarregar → debitar → relatório` completo.** Verificado com testes unitários e smoke ponta-a-ponta contra Postgres real (incluindo concorrência no débito).

---

## Principais rotas da API

| Área | Rotas |
|---|---|
| Auth | `POST /auth/login` · `GET /auth/me` · `GET /health` |
| Contas | `POST /students` · `GET /students(/:id)` · `POST /students/:id/card/{block,unblock,reissue}` · `PATCH /students/:id/photo` · `GET /guardians` · `POST`/`GET /operators` |
| Convite | `GET /invite/:token` · `POST /invite/activate` · `POST /invite/forgot-password` |
| Onboarding | `POST /onboarding/import` · `GET /onboarding/cards.pdf` · `POST /onboarding/{guardians,operators}/:id/invite` |
| Carteira | `GET /students/:id/wallet` · `PATCH /students/:id/daily-limit` · `POST /recharges` · `GET /recharges/:id` · `POST /recharges/webhook` |
| Catálogo | `GET/POST/PATCH/DELETE /products` · `PUT/DELETE /students/:id/blocks/:productId` |
| PDV | `GET /pdv/student?token=` · `GET /pdv/student-by-rm?rm=` · `POST /pdv/purchase` |
| Portal | `GET /me/students` · `GET /me/students/:id/statement` · `PATCH .../alert-threshold` · `POST .../card/block` |
| Relatório | `GET /reports/daily` · `GET /reports/daily/transactions` |

**40 endpoints.** As listagens (`/students`, `/products`, `/operators`, `/guardians`, extrato,
transações do dia) aceitam `?page`, `?limit` (máx. 100) e `?q`, devolvendo
`{ items, total, page, limit, hasNext }`.

---

## Stack

| Camada | Tecnologia |
|---|---|
| Backend | **NestJS 11 + Prisma + PostgreSQL** (implementado) |
| Auth | JWT + bcrypt · rate limiting (`@nestjs/throttler`) · headers via `helmet` |
| Pagamento | Porta `PaymentGateway` (hexagonal) — provedor real a definir; `FakeGateway` no dev |
| Onboarding | PapaParse (CSV) · pdfkit + qrcode (cartões) · Resend (e-mail, opcional) |
| Frontend | Next.js + React + Tailwind + shadcn/ui (**PWA**) — *planejado, ainda não implementado* |

Três superfícies previstas, um stack só: **Portal Responsável** (PWA), **PDV Operador** (Web/PWA com câmera), **Admin** (Web). Sem app nativo, sem totem, **uma escola por instância**.

O escopo do frontend já está especificado — **22 telas** derivadas das rotas reais, com endpoints
consumidos, validações e estados de cada uma, mais a auditoria que prova que nenhum endpoint ficou
órfão. Ver [`docs/design-plan/`](docs/design-plan/).

---

## Pagamento (gateway)

A recarga PIX fica atrás da flag `PAGAMENTOS_ATIVOS` **e** da porta `PaymentGateway` — o núcleo nunca fala com o SDK de um provedor. Hoje o adapter é o **`FakeGateway`** (determinístico, para dev/testes). O split (repasse à cantina) e a autenticação do webhook vivem **dentro** de cada adapter, então trocar de provedor é trocar o adapter, não o produto.

> O split do AbacatePay ainda não existe (em desenvolvimento). A estratégia é construir contra um gateway com split que já exista, em sandbox, e migrar depois — a porta torna essa troca barata.

---

## Começando (dev)

Pré-requisitos: **Node ≥ 20**, **Docker** (para o Postgres).

```bash
# 1. Instalar (monorepo npm workspaces)
npm install

# 2. Configurar ambiente
cp .env.example .env
#   DATABASE_URL, JWT_SECRET, PAGAMENTOS_ATIVOS, CORS_ORIGIN, SEED_*
#   RESEND_KEY é opcional (sem ela, convites degradam para "devolve o link")

# 3. Banco (Postgres via Docker, porta 5433) + migrations + seed do 1º admin
npm run db:up
npm run db:migrate      # aplica as migrations e gera o Prisma Client
npm run db:seed         # cria a escola + admin (SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD)

# 4. Rodar a API (http://localhost:3001)
npm run dev

# Testes
npm test
```

> A recarga PIX (`POST /recharges`) só responde com `PAGAMENTOS_ATIVOS=true`. Em produção, use `TZ=America/Sao_Paulo` (o "dia" do limite diário e do relatório é o dia local da escola).

### Travas de produção

Com `NODE_ENV=production`, a aplicação **se recusa a subir** se: o `JWT_SECRET` for o valor de exemplo,
o `CORS_ORIGIN` for `*`, ou o `FakeGateway` estiver ativo (ele credita saldo sem validar assinatura de
webhook). O seed também recusa a senha padrão de admin. São falhas propositais — melhor não subir do
que subir inseguro.

---

## Roadmap

- **Backend do MVP:** ✅ completo (M0–M7), no `main`, com 8 tags (`v0.1.0-m0` → `v0.8.0-m7`), endurecido
  em segurança e com as lacunas do plano de frontend já fechadas.
- **Escopo do frontend:** ✅ especificado em `docs/design-plan/` (22 telas). Identidade visual ainda não definida.
- **Próximo — frontend:** implementar as 3 superfícies — o que falta pra "rodar numa cantina real".
- **Próximo — pagamento real:** escolher o provedor com split (após CNPJ) e escrever o adapter concreto atrás da porta.
- **Deploy:** Vercel (front) + host do backend + Postgres gerenciado + `TZ=America/Sao_Paulo` + RLS no Supabase.
- **Pré-requisito de piloto:** configurar o `RESEND_KEY` — sem e-mail, convite e "esqueci a senha" não chegam ao responsável.
- **v1.1:** entrega do alerta de saldo baixo (push/e-mail), fila offline no PDV.
- **v2+:** app do aluno, estoque com quantidade, pré-encomenda, multi-escola, totem.

---

## Modelo

Micro-negócio **local** (Baixada Santista / SP). Receita = taxa de recarga paga pelo responsável. O diferencial não é o software (o mercado é maduro) — é **presença local**: instalar, treinar e resolver na hora.

---

*Projeto pessoal. Nome "Ambra" é provisório.*
