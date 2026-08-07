# Ambra 🍔💳

> Sistema **pré-pago de cantina escolar** (cashless closed-loop): o responsável recarrega o saldo do aluno via PIX, o aluno paga com um **cartão QR** no balcão, e o responsável **vê e controla** tudo.

**Não é uma fintech.** É um sistema de saldo fechado de cantina — simples, local, e focado.

`status: em desenvolvimento (reconstrução do zero) · MVP em definição`

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
                              débito atômico do saldo  →  extrato em tempo real (pai)
```

- **Identificação:** cartão QR impresso (sem app de aluno, sem celular).
- **Recarga:** só PIX remoto (via AbacatePay), com taxa fixa de **R$ 1,99**.
- **Segurança:** saldo nunca negativo; limite diário limita qualquer estrago; bloqueio/reemissão de cartão.

---

## Stack

| Camada | Tecnologia |
|---|---|
| Backend | NestJS + Prisma + PostgreSQL |
| Auth | JWT + bcrypt |
| Frontend | Next.js + React + Tailwind + shadcn/ui (**PWA**) |
| Pagamento | AbacatePay (PIX + split) |
| E-mail | Resend |

Três superfícies, um stack só: **Portal Responsável** (PWA), **PDV Operador** (Web/PWA com câmera), **Admin** (Web). Sem app nativo, sem totem, **uma escola por instância**.

---

## Começando (dev)

```bash
# 1. Instalar (monorepo npm workspaces)
npm install

# 2. Configurar ambiente
cp .env.example .env
#   DATABASE_URL, JWT_SECRET, PAGAMENTOS_ATIVOS, (ABACATEPAY_KEY/RESEND_KEY a partir do M3)

# 3. Banco (Postgres via Docker, porta 5433) + migrations + seed do 1º admin
npm run db:up
npm run db:migrate
npm run db:seed        # cria a escola + admin (SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD)

# 4. Rodar a API (http://localhost:3001)
npm run dev
```

> **Status do build:** M0 (Fundação & Auth) implementado no backend (`apps/api`): NestJS + Prisma + PostgreSQL, login JWT (1 dia) com bcrypt, papéis Admin/Operador/Responsável (guards globais), flag `PAGAMENTOS_ATIVOS`, uma escola por instância. Rotas: `GET /health`, `POST /auth/login`, `GET /auth/me`.

> Recarga PIX fica atrás da flag `PAGAMENTOS_ATIVOS` — construída no **sandbox** do AbacatePay, ligada em produção só quando a ME estiver aberta.

---

## Roadmap

- **v1 (MVP):** núcleo `recarregar → debitar → relatório` + onboarding, rodando em **1 cantina real**.
- **v1.1:** alerta de saldo baixo (push/e-mail), fila offline no PDV.
- **v2:** app do aluno, estoque com quantidade, pré-encomenda, painel Owner multi-escola.
- **v3+:** multi-escola de verdade, totem (custo da escola), relatórios avançados.

---

## Modelo

Micro-negócio **local** (Baixada Santista / SP). Receita = taxa de recarga paga pelo responsável. O diferencial não é o software (o mercado é maduro) — é **presença local**: instalar, treinar e resolver na hora.

---

*Projeto pessoal. Nome "Ambra" é provisório.*
