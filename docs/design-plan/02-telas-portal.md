# Telas — Portal Responsável (PWA)

Superfície do pai/mãe: celular, uso curto e esporádico. Tudo aqui exige papel `RESPONSAVEL` **e**
vínculo com o dependente — sem vínculo o backend responde 403, e a tela trata como "não encontrado".

---

## [R1] Meus dependentes

**Rota:** `/`
**Tipo:** tela
**Acesso:** RESPONSAVEL. Outro papel que chegar aqui é redirecionado para a home do seu papel.
**Objetivo:** ver de relance o saldo de cada filho e escolher em quem mexer.

### Chegada e saída
- **Chega de:** login; ícone de início; volta das telas de dependente.
- **Sai para:** R2 (tocar no card do dependente) · R3 (botão `Recarregar` do card).

### Endpoints consumidos
| Endpoint | Quando dispara | Usado para |
|---|---|---|
| `GET /me/students` | ao montar e ao voltar o foco na aba | listar dependentes com saldo, limite, limiar e status do cartão |

### Layout
Cabeçalho com o nome da escola e menu do usuário (sair). Conteúdo é uma lista vertical de cards, um
por dependente — no celular, um por linha. O saldo é a informação de maior peso visual do card.

### Elementos
- **[card de dependente]** por item: nome, turma, **saldo em destaque** (`R$ 24,50`), e chips de estado quando aplicável:
  - `Cartão bloqueado` quando `cardStatus = BLOCKED`;
  - `Saldo baixo` quando `balanceCents <= lowBalanceThresholdCents` (comparação feita no front — o backend só guarda o limiar);
  - `Limite diário R$ 15,00` quando `dailyLimitCents` não for nulo.
- **[botão secundário no card]** `Recarregar` — vai para R3 já com o dependente escolhido.
- **[área do card]** toque em qualquer outro ponto → R2.
- **[botão de texto no cabeçalho]** `Sair` — descarta o token e volta para `/entrar`.

### Estados
- **Carregando:** dois cards em esqueleto.
- **Vazio:** `Nenhum dependente vinculado à sua conta ainda. Fale com a secretaria da escola para vincular seu filho.` — não é um erro; acontece se o vínculo não foi feito.
- **Erro:** rede/500 → `Não foi possível carregar seus dependentes.` + `Tentar de novo`. 401 → volta para o login com aviso de sessão expirada.
- **Sucesso:** lista renderizada; o saldo reflete o retorno mais recente.

### Observações
Esta é a tela de entrada e a mais visitada — precisa carregar rápido e responder ao "quanto tem?" sem
nenhum toque. Com **um único dependente**, entrar direto em R2 é uma otimização válida a considerar
(fica registrado como decisão em aberto).

---

## [R2] Dependente — saldo e extrato

**Rota:** `/dependente/:id`
**Tipo:** tela
**Acesso:** RESPONSAVEL vinculado. Sem vínculo → 403 do backend → tela de "Dependente não encontrado" com link para R1.
**Objetivo:** entender o que o filho consumiu e quanto ainda tem.

### Chegada e saída
- **Chega de:** R1 (card) · R4 após confirmação de recarga.
- **Sai para:** R3 (`Recarregar`) · R5 (`Controles`) · R1 (voltar).

### Endpoints consumidos
| Endpoint | Quando dispara | Usado para |
|---|---|---|
| `GET /me/students` | ao montar | obter nome, saldo, limite e status do cartão deste dependente |
| `GET /me/students/:id/statement` | ao montar e ao puxar para atualizar | listar os lançamentos |

### Layout
Topo fixo com nome do dependente e saldo grande, com os dois botões de ação logo abaixo. O restante da
tela é o extrato, em lista cronológica decrescente, agrupada por dia.

### Elementos
- **[cabeçalho]** nome, turma e **saldo** (`R$ 24,50`); quando o cartão estiver bloqueado, faixa de aviso: `Cartão bloqueado — o aluno não consegue comprar. Peça a reemissão à escola.`
- **[botão primário]** `Recarregar` → R3.
- **[botão secundário]** `Controles` → R5.
- **[lista de lançamentos]** por item:
  - compra → ícone de saída, `- R$ 6,00`, horário (`12:47`), e a lista de itens do snapshot (`1× Coxinha · 1× Suco`);
  - recarga → ícone de entrada, `+ R$ 50,00`, horário, rótulo `Recarga`;
  - em ambos, saldo depois do lançamento em texto secundário (`Saldo: R$ 24,50`).
- **[separador de dia]** `Hoje`, `Ontem`, ou `12/08/2026`.
- **[botão no rodapé]** `Carregar mais` — pede a próxima página (`?page`); some quando `hasNext` for `false`. Rodapé final: `Fim do extrato.`

### Estados
- **Carregando:** cabeçalho em esqueleto + três linhas de lançamento em esqueleto.
- **Vazio:** `Nenhuma movimentação ainda. Assim que você recarregar ou o aluno comprar, aparece aqui.` com botão `Recarregar`.
- **Erro:** 403/404 → `Dependente não encontrado.` + `Voltar para meus dependentes`. Rede → `Tentar de novo`.
- **Sucesso:** lista populada; puxar para atualizar recarrega saldo e extrato juntos.

### Observações
O extrato é o principal argumento de valor do produto para o pai. **Formato:** moeda em `R$ 0,00`
(centavos convertidos no front, nunca com float), datas em PT-BR, horário em 24h. O "tempo real"
prometido é **polling curto** (refetch ao focar a aba), não WebSocket.

---

## [R3] Recarregar — escolher valor

**Rota:** `/dependente/:id/recarregar`
**Tipo:** tela
**Acesso:** RESPONSAVEL vinculado.
**Objetivo:** escolher quanto recarregar sabendo exatamente quanto vai pagar.

### Chegada e saída
- **Chega de:** R1 (botão do card) · R2 (botão `Recarregar`).
- **Sai para:** R4 (`Gerar PIX`) · volta para R2 (cancelar).

### Endpoints consumidos
| Endpoint | Quando dispara | Usado para |
|---|---|---|
| `GET /recharges/config` | ao montar | obter a taxa (`feeCents`) e os valores sugeridos |
| `POST /recharges` | clique em `Gerar PIX` | criar a cobrança e receber o código |

### Layout
Tela curta e objetiva: o nome do dependente no topo, os valores sugeridos como botões grandes, o campo
de outro valor abaixo, e o resumo do total fixo acima do botão de ação.

### Elementos
- **[botões de valor]** `R$ 50,00` · `R$ 100,00` · `R$ 150,00` — vindos de `suggestedAmountsCents`, nunca fixos no código do front.
- **[input moeda]** Outro valor — placeholder `R$ 0,00` — mínimo **R$ 5,00**. Erro: `A recarga mínima é de R$ 5,00.`
- **[resumo]** três linhas, sempre visíveis:
  - `Valor da recarga — R$ 100,00`
  - `Taxa de serviço — R$ 1,99`
  - **`Total a pagar — R$ 101,99`** em destaque.
- **[botão primário]** `Gerar PIX` — dispara `POST /recharges`; desabilitado sem valor válido.
- **[link]** `Cancelar` → volta para R2.

### Estados
- **Carregando:** botões de valor em esqueleto enquanto a config não chega.
- **Vazio:** não se aplica.
- **Erro:**
  - **recarga indisponível (503)** → substitui o formulário por `A recarga por PIX ainda não está disponível. Fale com a escola.` — acontece com `PAGAMENTOS_ATIVOS=false`, que é o estado atual até o gateway real ser escolhido;
  - valor abaixo do mínimo (400) → erro no campo;
  - 403 → `Você não tem acesso a este dependente.`
- **Sucesso:** navega para R4 levando `brCode`, `brCodeBase64`, `rechargeId` e `totalCents`.

### Observações
A taxa é **exibida sempre e antes de confirmar** — exigência de transparência (CDC) e decisão de
produto, não detalhe de UI. A taxa é fixa e não varia com o valor, o que naturalmente incentiva
recargas maiores.

---

## [R4] Recarregar — pagamento PIX

**Rota:** `/dependente/:id/recarregar/pagar`
**Tipo:** tela
**Acesso:** RESPONSAVEL vinculado. Recarregar a página sem os dados da cobrança volta para R3.
**Objetivo:** pagar o PIX e ver o saldo entrar.

### Chegada e saída
- **Chega de:** R3, após `POST /recharges`.
- **Sai para:** R2 (`Já paguei` ou confirmação automática).

### Endpoints consumidos
| Endpoint | Quando dispara | Usado para |
|---|---|---|
| `GET /recharges/:id` | a cada ~5s enquanto a tela estiver aberta, e ao clicar `Já paguei` | ler o **status real** da cobrança (`PENDING` / `CONFIRMED` / `FAILED`) |
| `GET /me/students` | após o status virar `CONFIRMED` | buscar o saldo novo para exibir na confirmação |

### Layout
QR code grande e centralizado (é o que a pessoa vai apontar o celular), código copia-e-cola logo
abaixo, total em destaque, e um indicador de "aguardando pagamento" fixo no rodapé.

### Elementos
- **[imagem QR]** renderizada de `brCodeBase64`.
- **[campo somente leitura + botão]** `Copiar código PIX` — copia `brCode`; ao copiar, muda para `Código copiado!` por 2s.
- **[texto]** `Total a pagar: R$ 101,99` (valor + taxa).
- **[indicador]** `Aguardando confirmação do pagamento…` com animação sutil.
- **[botão secundário]** `Já paguei` — força uma verificação imediata.
- **[link]** `Voltar` → R2 (a cobrança continua válida).

### Estados
- **Carregando:** enquanto verifica, o indicador continua; nunca bloquear a tela (a pessoa está pagando no app do banco).
- **Vazio:** não se aplica.
- **Erro:**
  - rede na verificação → mantém o QR e mostra `Não conseguimos verificar agora. Toque em "Já paguei".`
  - **status `FAILED`** → substitui o QR por `O pagamento não foi concluído. Você pode gerar um novo PIX.` + botão `Gerar novo PIX` (volta para R3).
- **Sucesso:** ao ler `status: CONFIRMED`, troca a tela por `Recarga confirmada! Novo saldo: R$ 124,50` e volta para R2 em ~2s.

### Observações
A tela lê o **status real** da cobrança em `GET /recharges/:id` — não infere pelo saldo. Isso é o que
permite distinguir "ainda não pagou" de "falhou", e é o que torna o botão `Gerar novo PIX` possível.
O endpoint só responde para o responsável que criou a recarga (ou Admin), então o `rechargeId` não
vaza informação de outra família.

---

## [R5] Controles do dependente

**Rota:** `/dependente/:id/controles`
**Tipo:** tela
**Acesso:** RESPONSAVEL vinculado.
**Objetivo:** definir as regras do filho — quanto pode gastar por dia, o que não pode comprar, quando avisar, e bloquear o cartão se sumir.

### Chegada e saída
- **Chega de:** R2 (botão `Controles`).
- **Sai para:** R2 (voltar) · R6 (modal de confirmação do bloqueio).

### Endpoints consumidos
| Endpoint | Quando dispara | Usado para |
|---|---|---|
| `GET /me/students` | ao montar | valores atuais de limite, limiar e status do cartão |
| `GET /products` | ao montar | listar o catálogo para marcar bloqueios |
| `GET /students/:id/blocks` | ao montar | saber quais produtos já estão bloqueados |
| `PATCH /students/:id/daily-limit` | ao salvar o limite | gravar ou remover o limite |
| `PATCH /me/students/:id/alert-threshold` | ao salvar o limiar | gravar ou remover o limiar |
| `PUT /students/:id/blocks/:productId` | ao marcar um item | bloquear |
| `DELETE /students/:id/blocks/:productId` | ao desmarcar um item | desbloquear |

### Layout
Três seções empilhadas, cada uma com título e ação própria — nada de um formulão único com um "Salvar"
lá no fim: `Limite diário`, `Itens bloqueados`, `Cartão`.

### Elementos
**Seção Limite diário**
- **[toggle]** `Definir limite diário` — desligado significa sem limite (`null`).
- **[input moeda]** Valor do limite — placeholder `R$ 15,00` — inteiro ≥ 0 em centavos. Erro: `Informe um valor válido.`
- **[texto de apoio]** `O aluno não conseguirá gastar mais que isso no mesmo dia.`
- **[botão]** `Salvar limite`.

**Seção Itens bloqueados**
- **[lista de produtos com checkbox]** um por produto ativo: nome e preço. Marcado = bloqueado.
- **[texto de apoio]** `Itens marcados não podem ser comprados por este aluno — útil para alergia ou regra da casa.`
- **[comportamento]** cada marcar/desmarcar salva na hora (otimista, com reversão em caso de erro); nada de botão "Salvar" para esta seção.

**Seção Cartão**
- **[texto de estado]** `Cartão ativo` ou `Cartão bloqueado desde …`.
- **[botão destrutivo]** `Bloquear cartão` — abre R6. Some quando já estiver bloqueado.
- **[texto de apoio quando bloqueado]** `Achou o cartão? A escola pode desbloquear sem trocar o cartão. Se ele foi perdido de vez, peça a reemissão.` — o desbloqueio é ação do Admin (A3), não do responsável: quem bloqueia por segurança não deve poder desbloquear sozinho.

### Filtros e busca
Na lista de produtos, busca por nome via `?q` na API. A tela pede `limit=100` para trazer o catálogo
inteiro de uma vez — é o certo aqui: o pai precisa ver **todos** os itens para decidir o que bloquear,
e uma cantina não passa de algumas dezenas de produtos.

### Estados
- **Carregando:** cada seção com esqueleto próprio; a tela não espera tudo para renderizar.
- **Vazio:** sem produtos cadastrados → `A cantina ainda não cadastrou produtos.` na seção de bloqueios.
- **Erro:** falha ao salvar → reverte o controle ao valor anterior e mostra `Não foi possível salvar. Tente de novo.`
- **Sucesso:** confirmação discreta por seção (`Limite salvo`), sem sair da tela.

### Observações
Bloquear item é **preventivo, decidido em casa** — nunca uma negociação no balcão. Por isso a tela vive
no Portal e não no PDV: o operador apenas vê o "X" já resolvido.

---

## [R6] Confirmar bloqueio do cartão

**Tipo:** modal
**Acesso:** RESPONSAVEL vinculado, a partir de R5.
**Objetivo:** confirmar uma ação de efeito imediato, deixando claro o que ela custa.

### Endpoints consumidos
| Endpoint | Quando dispara | Usado para |
|---|---|---|
| `POST /me/students/:id/card/block` | clique em `Bloquear agora` | bloquear o cartão |

### Elementos
- **[título]** `Bloquear o cartão de {nome}?`
- **[texto]** `O cartão para de funcionar na hora. O aluno não conseguirá comprar na cantina até a escola reemitir um cartão novo — o QR atual deixa de valer.`
- **[botão destrutivo]** `Bloquear agora`.
- **[botão secundário]** `Cancelar`.

### Estados
- **Carregando:** botão com spinner, modal não fecha.
- **Erro:** `Não foi possível bloquear. Tente de novo.` — o modal continua aberto.
- **Sucesso:** fecha, atualiza R5 e mostra `Cartão bloqueado.`

### Observações
Ação destrutiva e de efeito imediato: exige confirmação explícita e diz **exatamente** o que será
perdido (o QR atual). É o caminho rápido para "perdi o cartão" — a fricção precisa ser baixa, mas não
acidental.
