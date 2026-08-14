# Auditoria de cobertura

Cruzamento entre os 40 endpoints do backend e as 22 telas planejadas. Nenhum endpoint fica sem
classificação: **coberto**, **órfão** ou **uso interno**.

> **Revisada após o fechamento das lacunas.** A auditoria original encontrou 9 lacunas de backend;
> todas foram resolvidas, somando 6 endpoints. Eles não entraram como órfãos: geraram duas telas
> novas (**P3** esqueci-a-senha e **A8** responsáveis) e ampliaram **A3**, **A7** e **R4**.

---

## 1. Endpoint → tela

| Endpoint | Telas que consomem | Situação |
|---|---|---|
| `GET /health` | — | **uso interno** (monitoramento/infra, não precisa de UI) |
| `POST /auth/login` | P1 | coberto |
| `GET /auth/me` | P1 (restauração de sessão, todas as superfícies) | coberto |
| `GET /invite/:token` | P2 | coberto |
| `POST /invite/activate` | P2 | coberto |
| `POST /invite/forgot-password` | **P3** | coberto |
| `POST /students` | A4 | coberto |
| `GET /students` | A1, A2, A6 | coberto |
| `GET /students/:id` | A3 | coberto |
| `POST /students/:id/card/block` | A3 | coberto |
| `POST /students/:id/card/unblock` | A3 | coberto |
| `POST /students/:id/card/reissue` | A3 | coberto |
| `PATCH /students/:id/photo` | A3 | coberto |
| `GET /guardians` | **A8** | coberto |
| `POST /operators` | A7 | coberto |
| `GET /operators` | A7 | coberto |
| `POST /onboarding/import` | A5 | coberto |
| `GET /onboarding/cards.pdf` | A6 | coberto |
| `POST /onboarding/guardians/:id/invite` | A3, **A8** | coberto |
| `POST /onboarding/operators/:id/invite` | **A7** | coberto |
| `GET /students/:id/wallet` | A3 | coberto |
| `PATCH /students/:id/daily-limit` | R5, A3 | coberto |
| `POST /recharges` | R3 | coberto |
| `GET /recharges/config` | R3 | coberto |
| `GET /recharges/:id` | R4 | coberto |
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
| P1 Entrar | `POST /auth/login`, `GET /auth/me` | — |
| P2 Ativar conta | `GET /invite/:token`, `POST /invite/activate` | — |
| **P3 Esqueci minha senha** | `POST /invite/forgot-password` | — |
| R1 Meus dependentes | `GET /me/students` | — |
| R2 Dependente | `GET /me/students`, `GET /me/students/:id/statement` (paginado) | — |
| R3 Recarregar — valor | `GET /recharges/config`, `POST /recharges` | — |
| R4 Recarregar — pagamento | `GET /recharges/:id` (polling), `GET /me/students` | — |
| R5 Controles | `GET /me/students`, `GET /products`, `GET /students/:id/blocks`, `PATCH /students/:id/daily-limit`, `PATCH /me/students/:id/alert-threshold`, `PUT`/`DELETE /students/:id/blocks/:productId` | — |
| R6 Confirmar bloqueio | `POST /me/students/:id/card/block` | — |
| O1 Leitor | `GET /pdv/student?token=` | — |
| O2 Pedido | `GET /pdv/student?token=`, `POST /pdv/purchase` | foto depende de a escola hospedar a imagem (A3) |
| O3 Buscar por RM | `GET /pdv/student-by-rm?rm=` | idem |
| O4 Catálogo | `GET /products` (`?q`), `POST`, `PATCH`, `DELETE /products/:id` | — |
| O5 Fechamento | `GET /reports/daily`, `GET /reports/daily/transactions` (paginado) | — |
| A1 Início | `GET /reports/daily`, `GET /students` (usa só o `total`) | — |
| A2 Alunos | `GET /students` (`?page`, `?limit`, `?q`) | — |
| A3 Aluno (detalhe) | `GET /students/:id`, `GET /students/:id/wallet`, `POST .../card/block`, `POST .../card/unblock`, `POST .../card/reissue`, `PATCH .../photo`, `POST /onboarding/guardians/:id/invite`, `PATCH .../daily-limit` | — |
| A4 Cadastrar aluno | `POST /students` | — |
| A5 Importar CSV | `POST /onboarding/import` | — |
| A6 Cartões | `GET /onboarding/cards.pdf`, `GET /students` | sem filtro por aluno (só por turma) |
| A7 Operadores | `GET /operators`, `POST /operators`, `POST /onboarding/operators/:id/invite` | — |
| **A8 Responsáveis** | `GET /guardians` (`?status`, `?q`), `POST /onboarding/guardians/:id/invite` | — |

**Telas estáticas (sem endpoint): 0.**

---

## 3. Lacunas de backend — todas fechadas

A auditoria original encontrou 9 lacunas. **Todas foram resolvidas** antes de o frontend começar, o
que é o momento mais barato de fazer isso: nenhuma tela precisou nascer torta para contornar buraco.

| # | Lacuna original | Como foi resolvida | Tela que passou a existir/mudar |
|---|---|---|---|
| L1 | Sem recuperação de senha | `POST /invite/forgot-password` (resposta idêntica exista ou não a conta, 5/min) | **P3** (nova) e link em P1 |
| L2 | Sem status de recarga | `GET /recharges/:id` | R4 pergunta o status e trata `FAILED` |
| L3 | Sem paginação nem busca | `?page`, `?limit` (máx. 100), `?q` nas 4 listagens | A2, A7, O4, O5 |
| L4 | Extrato preso em 30 | `?page`/`?limit` no extrato | R2 |
| L5 | Sem foto do aluno | `PATCH /students/:id/photo` (URL hospedada) | A3 ganha a seção Foto |
| L6 | Reenvio só p/ responsável | `POST /onboarding/operators/:id/invite` | A7 ganha `Reenviar convite` |
| L7 | Sem lista de responsáveis | `GET /guardians?status=PENDING` | **A8** (nova) |
| L8 | Sem desbloquear sem reemitir | `POST /students/:id/card/unblock` | A3 ganha `Desbloquear cartão` |
| L9 | Sessão sobrevivia à troca de senha | `tokenVersion` + `tv` no JWT | P2 avisa que as outras sessões caem |

### Restrições que permanecem (não são lacunas — são decisões)

- **Foto por URL, não upload.** Onde guardar binário é decisão de infra ainda aberta (provavelmente
  Supabase Storage, junto com o RLS). Até lá, a foto só funciona se a escola já hospedar as imagens.
- **Sem `RESEND_KEY`, o "esqueci a senha" não entrega.** O link vai só por e-mail (não pode voltar na
  resposta, senão qualquer um redefiniria senha alheia). Nesse cenário a saída é o Admin reenviar o
  convite por A3/A8. **Configurar o Resend é pré-requisito de piloto.**
- **PDF de cartões sem filtro por aluno** — só por turma (melhoria, não lacuna).

---

## 4. Números finais

| Métrica | Valor |
|---|---|
| Endpoints no backend | **40** |
| Cobertos por alguma tela | **37** |
| Uso interno (justificados) | **3** — `GET /health`, `POST /recharges/webhook`, `GET /products/:id` |
| **Órfãos** | **0** |
| Telas planejadas | **22** (20 com rota + 2 modais) |
| Telas sem endpoint | **0** |
| **Lacunas de backend em aberto** | **0** |

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
