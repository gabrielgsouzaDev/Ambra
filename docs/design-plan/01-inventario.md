# Inventário do backend

> Extraído do código real (`schema.prisma`, controllers, DTOs, guards) em 2026-08-13, no commit do
> `main` após o hardening de segurança. Nada aqui é suposição: se não está no código, não está aqui.

---

## 1. Entidades

| Entidade | Campos relevantes para UI | Relações | Quem cria/edita |
|---|---|---|---|
| **School** | `name`, `slug?` | 1:N User, Student, Product | Só o seed (uma escola por instância) |
| **User** | `name`, `email` (único), `role`, `status` (PENDING/ACTIVE) | N:N Student via GuardianStudent; 1:N Recharge | Admin cria Operador e Responsável (este via cadastro de aluno/CSV) |
| **Student** | `name`, `turma?`, `rm`, `qrToken` (opaco), `photoUrl?`, `cardStatus`, `balanceCents`, `dailyLimitCents?`, `lowBalanceThresholdCents?`, `version` | N:N User; 1:N Transaction, Recharge, Block | Admin cria; Responsável edita limites/bloqueios |
| **GuardianStudent** | vínculo puro | N:N | Criado junto com o aluno (1 a 2 responsáveis) |
| **Product** | `name`, `priceCents`, `available`, `active` | 1:N Block, TransactionItem | Admin e Operador |
| **StudentProductBlock** | vínculo aluno↔produto | único por par | Responsável (ou Admin) |
| **Transaction** | `type` (RECHARGE/PURCHASE), `amountCents`, `balanceAfterCents`, `createdAt` | 1:N TransactionItem | Sistema (append-only, nunca editável) |
| **TransactionItem** | `productName`, `unitPriceCents`, `quantity` (snapshot) | — | Sistema |
| **Recharge** | `amountCents`, `feeCents`, `gatewayChargeId?`, `status` (PENDING/CONFIRMED/FAILED), `confirmedAt?` | — | Responsável inicia; webhook confirma |

**Constantes de negócio** (`wallet.constants.ts`): taxa `R$ 1,99` (199), recarga mínima `R$ 5,00`
(500), valores sugeridos `R$ 50 / 100 / 150`. Dinheiro sempre `Int` em centavos.

---

## 2. Endpoints (22)

| Método e caminho | O que faz | Quem chama | Recebe | Devolve |
|---|---|---|---|---|
| `GET /health` | Liveness + estado da flag | **público** | — | `{status, paymentsEnabled, timestamp}` |
| `POST /auth/login` | Login → JWT (1 dia) | **público** (10/min) | `{email, password}` | `{accessToken, user}` |
| `GET /auth/me` | Usuário logado | autenticado | — | `{id, email, role, schoolId}` |
| `GET /invite/:token` | Verifica convite | **público** | — | `{name, email}` |
| `POST /invite/activate` | Cria senha e ativa | **público** | `{token, password}` | `{activated: true}` |
| `POST /students` | Cadastra aluno + 1–2 responsáveis | ADMIN | `CreateStudentDto` | `{student, guardians[]}` |
| `GET /students` | Lista alunos **paginada**, busca por nome ou RM | ADMIN | `?page&limit&q` | `{items[], total, page, limit, hasNext}` |
| `GET /students/:id` | Detalhe + responsáveis | ADMIN | — | aluno + `qrToken` + `guardians[]` |
| `POST /students/:id/card/block` | Bloqueia cartão | ADMIN | — | `{id, name, cardStatus}` |
| `POST /students/:id/card/reissue` | Reemite (novo QR) | ADMIN | — | `{id, name, qrToken, cardStatus}` |
| `POST /operators` | Cria operador + convite | ADMIN | `{name, email}` | operador + `activationToken` |
| `GET /operators` | Lista operadores **paginada**, busca por nome/e-mail | ADMIN | `?page&limit&q` | `{items[], total, page, limit, hasNext}` |
| `POST /onboarding/import` | Importa CSV | ADMIN | `{csv}` | `{total, created, failed[]}` |
| `GET /onboarding/cards.pdf` | PDF dos cartões | ADMIN | `?turma` | PDF (máx. 500) |
| `POST /onboarding/guardians/:id/invite` | Envia/reenvia convite | ADMIN | — | `{email, sent, activationLink}` |
| `GET /students/:id/wallet` | Saldo e limite | ADMIN, RESPONSAVEL* | — | `{id, name, balanceCents, dailyLimitCents}` |
| `PATCH /students/:id/daily-limit` | Define limite diário | ADMIN, RESPONSAVEL* | `{dailyLimitCents?}` | aluno + limite |
| `POST /recharges` | Cria cobrança PIX | ADMIN, RESPONSAVEL* | `{studentId, amountCents}` | `{rechargeId, totalCents, brCode, brCodeBase64}` |
| `GET /recharges/config` | Taxa + valores sugeridos | ADMIN, RESPONSAVEL | — | `{feeCents, suggestedAmountsCents}` |
| `GET /recharges/:id` | **Status da recarga** | ADMIN, ou o responsável que a criou | — | `{id, studentId, amountCents, feeCents, totalCents, status, createdAt, confirmedAt}` |
| `POST /recharges/webhook` | Confirma pagamento | **público** (30/min) | payload do gateway | `{received: true}` |
| `GET /products` | Catálogo ativo **paginado**, busca por nome | ADMIN, OPERATOR, RESPONSAVEL | `?page&limit&q` | `{items[], total, page, limit, hasNext}` |
| `GET /products/:id` | Detalhe do produto | ADMIN, OPERATOR, RESPONSAVEL | — | produto |
| `POST /products` | Cria produto | ADMIN, OPERATOR | `{name, priceCents}` | produto |
| `PATCH /products/:id` | Edita / toggle disponível | ADMIN, OPERATOR | `{name?, priceCents?, available?}` | produto |
| `DELETE /products/:id` | Soft-delete | ADMIN, OPERATOR | — | produto (`active:false`) |
| `GET /students/:id/blocks` | Produtos bloqueados | ADMIN, RESPONSAVEL* | — | `[{id, name, priceCents}]` |
| `PUT /students/:id/blocks/:productId` | Bloqueia produto | ADMIN, RESPONSAVEL* | — | `{blocked: true}` |
| `DELETE /students/:id/blocks/:productId` | Desbloqueia | ADMIN, RESPONSAVEL* | — | `{blocked: false}` |
| `GET /pdv/student?token=` | Aluno pelo QR | OPERATOR, ADMIN | `?token` | aluno + saldo + limite restante + catálogo com flags |
| `GET /pdv/student-by-rm?rm=` | Aluno pelo RM (fallback) | OPERATOR, ADMIN (20/min) | `?rm` | idem |
| `POST /pdv/purchase` | **Débito atômico** | OPERATOR, ADMIN | `{studentId, items[]}` | `{transactionId, totalCents, balanceAfterCents, items[]}` |
| `GET /me/students` | Meus dependentes | RESPONSAVEL | — | `[{id, name, turma, balanceCents, dailyLimitCents, lowBalanceThresholdCents, cardStatus}]` |
| `GET /me/students/:id/statement` | Extrato (últimas 30) | RESPONSAVEL* | — | `[{type, amountCents, balanceAfterCents, createdAt, items[]}]` |
| `PATCH /me/students/:id/alert-threshold` | Limiar de alerta | RESPONSAVEL* | `{thresholdCents?}` | aluno + limiar |
| `POST /me/students/:id/card/block` | Pede bloqueio do cartão | RESPONSAVEL* | — | `{id, name, cardStatus}` |
| `GET /reports/daily` | Fechamento do dia | OPERATOR, ADMIN | `?date=YYYY-MM-DD` | `{date, totalCents, purchaseCount, averageTicketCents, byProduct[]}` |
| `GET /reports/daily/transactions` | Compras do dia **paginadas** | OPERATOR, ADMIN | `?date&page&limit` | `{items[], total, page, limit, hasNext}` |

`*` = além do papel, exige **vínculo** com o aluno (`GuardianStudent`). Sem vínculo → **403**.

---

## 3. Papéis

| Papel | Superfície | O que pode fazer |
|---|---|---|
| **ADMIN** (escola) | Admin Web | Tudo do onboarding: cadastrar/importar alunos, gerar cartões, criar operadores, enviar convites, bloquear/reemitir cartão, gerenciar catálogo, ver relatórios. Também acessa carteira e PDV. |
| **OPERATOR** (cantina) | PDV | Ler cartão (QR ou RM), fazer a venda (débito), gerenciar catálogo (preço e disponível), ver o fechamento do dia. **Não** cadastra aluno nem operador (403). |
| **RESPONSAVEL** (pai/mãe) | Portal PWA | Ver dependentes, saldo e extrato; recarregar via PIX; definir limite diário e limiar de alerta; bloquear produtos; pedir bloqueio do cartão. Só dos **seus** dependentes. |
| *Aluno* | — | **Não loga.** É passivo: identificado pelo cartão QR no balcão. |

**Autorização:** JWT Bearer (1 dia, sem refresh). O papel é lido **do banco** a cada request, não do
token. Guards globais: `ThrottlerGuard` → `JwtAuthGuard` → `RolesGuard`. Rota pública exige `@Public()`
explícito. Uma escola por instância — **não há seleção de tenant**.

---

## 4. Fluxos de negócio suportados

1. **Onboarding da escola** — Admin importa CSV (ou cadastra aluno a aluno) → sistema cria alunos,
   responsáveis PENDING e vínculos, gerando `qrToken` → Admin gera o PDF dos cartões → escola imprime
   e distribui → Admin envia convites → responsável ativa a conta.
2. **Provisionamento do operador** — Admin cria operador (PENDING + convite) → operador ativa a conta
   → passa a operar o PDV.
3. **Recarga** — Responsável escolhe dependente e valor → sistema mostra `valor + R$ 1,99` → cria a
   cobrança PIX (atrás da flag `PAGAMENTOS_ATIVOS`) → responsável paga → **webhook** confirma →
   saldo creditado (uma vez só) e lançamento no extrato.
4. **Venda no balcão** — Aluno chega e pede → operador escaneia o QR (ou consulta por RM) → tela mostra
   saldo, limite restante e catálogo com bloqueados marcados → operador monta o pedido → confirma →
   **débito atômico** → extrato aparece para o responsável.
5. **Controle do responsável** — define limite diário, bloqueia produtos (alergia/regra da casa),
   define limiar de alerta, e pode bloquear o cartão na hora se sumir.
6. **Fechamento** — Operador/Admin consulta o total do dia, número de compras, ticket médio e o que
   mais vendeu.
7. **Cartão perdido** — Responsável bloqueia (soft, imediato) → Admin reemite (novo `qrToken`,
   invalida o antigo) → escola imprime o cartão novo.

---

## 5. Lacunas de backend encontradas no inventário

Registradas aqui porque **afetam telas**. Nenhuma foi assumida como existente no plano.

| # | Lacuna | Impacto na UI | Endpoint que precisaria existir |
|---|---|---|---|
| **L1** | Não há "esqueci minha senha" self-service | O responsável que esquecer a senha depende de ligar para a escola | `POST /auth/forgot-password` (reusaria o mecanismo de convite) |
| ~~L2~~ | ~~Não há como consultar uma recarga~~ | ✅ **RESOLVIDA** — `GET /recharges/:id` devolve o status (só o dono da recarga ou Admin) | — |
| ~~L3~~ | ~~Nenhuma listagem tem paginação ou busca~~ | ✅ **RESOLVIDA** — `?page`, `?limit` e `?q` em `/students`, `/products`, `/operators` e `/reports/daily/transactions`, com envelope `{items, total, page, limit, hasNext}` | — |
| **L4** | Extrato limitado a 30 lançamentos, sem paginação | O responsável não vê histórico além dos 30 últimos | `?page` ou `?before` em `/me/students/:id/statement` |
| **L5** | Não há upload de foto do aluno | `photoUrl` existe no schema e o PDV usa, mas nada grava | `POST /students/:id/photo` |
| **L6** | Reenvio de convite só funciona para RESPONSAVEL | Se o operador perder o link de ativação, não há reenvio | estender `/onboarding/guardians/:id/invite` ou criar `/operators/:id/invite` |
| **L7** | Não há listagem de responsáveis | O Admin só vê responsáveis entrando aluno por aluno; não há tela de "convites pendentes" | `GET /guardians?status=PENDING` |
| **L8** | Não há desbloqueio de cartão sem reemissão | Bloqueou por engano? Só reemitindo (troca o QR e obriga reimprimir) | `POST /students/:id/card/unblock` |
| **L9** | Não há logout no servidor | Aceitável (JWT stateless — o cliente descarta o token), mas fica registrado | — (uso interno) |

**Inconsistência menor observada:** `LoginDto` ainda exige senha ≥ 6 enquanto `ActivateDto` exige ≥ 8.
Não enfraquece nada (toda senha nasce com ≥ 8 na ativação), mas as mensagens divergem.
