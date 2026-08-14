# Auditoria de cobertura

Cruzamento entre os 34 endpoints do backend e as 20 telas planejadas. Nenhum endpoint fica sem
classificação: **coberto**, **órfão** ou **uso interno**.

---

## 1. Endpoint → tela

| Endpoint | Telas que consomem | Situação |
|---|---|---|
| `GET /health` | — | **uso interno** (monitoramento/infra, não precisa de UI) |
| `POST /auth/login` | P1 | coberto |
| `GET /auth/me` | P1 (restauração de sessão, todas as superfícies) | coberto |
| `GET /invite/:token` | P2 | coberto |
| `POST /invite/activate` | P2 | coberto |
| `POST /students` | A4 | coberto |
| `GET /students` | A1, A2, A6 | coberto |
| `GET /students/:id` | A3 | coberto |
| `POST /students/:id/card/block` | A3 | coberto |
| `POST /students/:id/card/reissue` | A3 | coberto |
| `POST /operators` | A7 | coberto |
| `GET /operators` | A7 | coberto |
| `POST /onboarding/import` | A5 | coberto |
| `GET /onboarding/cards.pdf` | A6 | coberto |
| `POST /onboarding/guardians/:id/invite` | A3 | coberto |
| `GET /students/:id/wallet` | A3 | coberto |
| `PATCH /students/:id/daily-limit` | R5, A3 | coberto |
| `POST /recharges` | R3 | coberto |
| `GET /recharges/config` | R3 | coberto |
| `POST /recharges/webhook` | — | **uso interno** (chamado pelo gateway, nunca por tela) |
| `GET /products` | R5, O2 (via `/pdv/student`), O4 | coberto |
| `GET /products/:id` | — | **uso interno** (O4 edita a partir da linha já carregada da lista; endpoint fica disponível, sem tela dedicada) |
| `POST /products` | O4 | coberto |
| `PATCH /products/:id` | O4 | coberto |
| `DELETE /products/:id` | O4 | coberto |
| `GET /students/:id/blocks` | R5 | coberto |
| `PUT /students/:id/blocks/:productId` | R5 | coberto |
| `DELETE /students/:id/blocks/:productId` | R5 | coberto |
| `GET /pdv/student?token=` | O1, O2 | coberto |
| `GET /pdv/student-by-rm?rm=` | O3 | coberto |
| `POST /pdv/purchase` | O2 | coberto |
| `GET /me/students` | R1, R2, R4, R5 | coberto |
| `GET /me/students/:id/statement` | R2 | coberto |
| `PATCH /me/students/:id/alert-threshold` | R5 | coberto |
| `POST /me/students/:id/card/block` | R6 | coberto |
| `GET /reports/daily` | O5, A1 | coberto |
| `GET /reports/daily/transactions` | O5 | coberto |

**Órfãos: 0.** Todo endpoint construído no backend aparece em pelo menos uma tela, ou está
justificado como uso interno.

---

## 2. Tela → endpoint

| Tela | Endpoints consumidos | Lacunas que afetam a tela |
|---|---|---|
| P1 Entrar | `POST /auth/login`, `GET /auth/me` | **L1** — sem "esqueci a senha", a tela só orienta procurar a escola |
| P2 Ativar conta | `GET /invite/:token`, `POST /invite/activate` | — |
| R1 Meus dependentes | `GET /me/students` | — |
| R2 Dependente | `GET /me/students`, `GET /me/students/:id/statement` | **L4** — extrato preso nos 30 últimos, sem paginação |
| R3 Recarregar — valor | `GET /recharges/config`, `POST /recharges` | — |
| R4 Recarregar — pagamento | `GET /me/students` (polling) | **L2** — sem `GET /recharges/:id`, o status é inferido pelo saldo |
| R5 Controles | `GET /me/students`, `GET /products`, `GET /students/:id/blocks`, `PATCH /students/:id/daily-limit`, `PATCH /me/students/:id/alert-threshold`, `PUT`/`DELETE /students/:id/blocks/:productId` | **L8** — sem desbloqueio de cartão sem reemissão |
| R6 Confirmar bloqueio | `POST /me/students/:id/card/block` | — |
| O1 Leitor | `GET /pdv/student?token=` | — |
| O2 Pedido | `GET /pdv/student?token=`, `POST /pdv/purchase` | **L5** — foto do aluno nunca aparece (nada grava `photoUrl`) |
| O3 Buscar por RM | `GET /pdv/student-by-rm?rm=` | **L5** — mesma coisa: a confirmação visual fica só no nome |
| O4 Catálogo | `GET /products`, `POST`, `PATCH`, `DELETE /products/:id` | busca é local (sem `?q` no backend) |
| O5 Fechamento | `GET /reports/daily`, `GET /reports/daily/transactions` | **L3** — lista de vendas do dia sem paginação |
| A1 Início | `GET /reports/daily`, `GET /students` | **L3** — contar alunos baixando a lista inteira |
| A2 Alunos | `GET /students` | **L3** — sem paginação nem busca no servidor |
| A3 Aluno (detalhe) | `GET /students/:id`, `GET /students/:id/wallet`, `POST .../card/block`, `POST .../card/reissue`, `POST /onboarding/guardians/:id/invite`, `PATCH .../daily-limit` | **L6**, **L7**, **L8** |
| A4 Cadastrar aluno | `POST /students` | — |
| A5 Importar CSV | `POST /onboarding/import` | — |
| A6 Cartões | `GET /onboarding/cards.pdf`, `GET /students` | sem filtro por aluno (só por turma) |
| A7 Operadores | `GET /operators`, `POST /operators` | **L6** — sem reenvio de convite para operador |

**Telas estáticas (sem endpoint): 0.**

---

## 3. Lacunas de backend

Nenhuma tela do plano assume um endpoint que não existe. Estas lacunas foram **contornadas** no plano —
mas três delas degradam experiência básica e deveriam ser resolvidas antes de rodar numa escola real.

| # | Lacuna | Endpoint que precisaria existir | Gravidade |
|---|---|---|---|
| ~~L2~~ | ~~Status de uma recarga~~ | ✅ **RESOLVIDA** — `GET /recharges/:id` existe. R4 agora **pergunta** o status em vez de inferir pelo saldo; `FAILED` fica distinguível de "ainda não paga" | — |
| ~~L3~~ | ~~Paginação e busca~~ | ✅ **RESOLVIDA** — `?page`, `?limit` (máx. 100) e `?q` nas 4 listagens, com envelope `{items, total, page, limit, hasNext}`. A2 e O5 paginam no servidor; O4 e R5 pedem `limit=100` | — |
| **L1** | Sem recuperação de senha self-service | `POST /auth/forgot-password` | 🟠 média — todo esquecimento vira ligação para a secretaria |
| **L6** | Reenvio de convite só para responsável | estender `/onboarding/guardians/:id/invite` ou criar `/operators/:id/invite` | 🟠 média — operador que perde o link precisa ser recriado |
| **L4** | Extrato preso em 30 lançamentos | `?page` ou `?before` em `/me/students/:id/statement` | 🟠 média — o pai não vê histórico do mês |
| **L5** | Sem upload de foto do aluno | `POST /students/:id/photo` | 🟠 média — a confirmação visual do fallback por RM não funciona |
| **L7** | Sem listagem de responsáveis | `GET /guardians?status=PENDING` | 🟡 baixa — não há tela de "convites pendentes"; só aluno por aluno |
| **L8** | Sem desbloquear cartão sem reemitir | `POST /students/:id/card/unblock` | 🟡 baixa — bloqueio por engano obriga reimprimir |
| **L9** | Sem logout no servidor | — | ⚪ aceito — JWT stateless; o cliente descarta o token |

---

## 4. Números finais

| Métrica | Valor |
|---|---|
| Endpoints no backend | **34** |
| Cobertos por alguma tela | **31** |
| Uso interno (justificados) | **3** — `GET /health`, `POST /recharges/webhook`, `GET /products/:id` |
| **Órfãos** | **0** |
| Telas planejadas | **20** (18 com rota + 2 modais) |
| Telas sem endpoint | **0** |
| **Lacunas de backend** | **9** — 2 altas, 4 médias, 2 baixas, 1 aceita |

---

## 5. Revisão contra o checklist de UX

Pontos que a revisão levantou e como o plano resolve:

- **Fluxo sem fim** — todos os 7 fluxos do inventário terminam em tela: onboarding acaba no cartão
  entregue e no convite ativado (A5→A6→A3→P2); recarga acaba no saldo creditado (R3→R4→R2); venda acaba
  no "Liberado" (O1→O2).
- **Dado que ninguém coleta** — nenhum. A única tela que pediria algo inexistente seria uma de foto do
  aluno; ela **não foi planejada**, e a ausência está declarada como L5.
- **Ação destrutiva sem confirmação** — bloquear cartão (R6, A3), reemitir cartão (A3) e remover
  produto (O4) têm confirmação com o custo explícito.
- **Listagem sem paginação** — A2, O5 e R2 são as que crescem. Estão declaradas em L3/L4, com a
  mitigação de front (busca e virtualização locais) registrada nas telas.
- **Navegação só de um papel aparecendo para todos** — cada superfície tem menu próprio, montado a
  partir do papel devolvido em `GET /auth/me`. Nenhum item cruza de papel.
- **Estados** — as 20 telas declaram carregando, vazio, erro e sucesso; os erros estão mapeados por
  código HTTP real (401, 403, 404, 409, 429, 503), não genéricos.
- **Operação demorada com feedback** — importação de CSV (A5) e geração de PDF (A6) têm estado de
  progresso e aviso para não fechar a página.
- **Mobile** — o PDV é mobile-first por definição; o Portal é PWA de celular; o Admin é desktop com as
  tabelas virando cards no mobile.

### Pontos que ficam em aberto para decisão

1. **Entrar direto no dependente** quando o responsável tiver só um filho (pula R1)?
2. **Login automático após ativar a conta** (P2), em vez de mandar para `/entrar`?
3. **Gerar PDF de um aluno só** (A6) — hoje o filtro é apenas por turma.
