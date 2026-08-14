# Telas — PDV Operador

Superfície do balcão: celular ou tablet com câmera, usado sob pressão nos 15 minutos de recreio.
Regra que rege todas as telas aqui: **menos toques, letra grande, nada que exija leitura**.
Papéis: `OPERATOR` e `ADMIN`.

---

## [O1] Vender — leitor de cartão

**Rota:** `/`
**Tipo:** tela
**Acesso:** OPERATOR, ADMIN. É a home do operador.
**Objetivo:** identificar o aluno em menos de dois segundos.

### Chegada e saída
- **Chega de:** login; fim de uma venda (O2); item `Vender` da barra inferior.
- **Sai para:** O2 (cartão lido com sucesso) · O3 (modal de busca por RM).

### Endpoints consumidos
| Endpoint | Quando dispara | Usado para |
|---|---|---|
| `GET /pdv/student?token=` | assim que a câmera decodifica um QR | buscar aluno, saldo, limite restante e catálogo |

### Layout
A câmera ocupa quase toda a tela, com uma moldura de mira ao centro. Abaixo, um único botão para o
caso do aluno ter esquecido o cartão. Barra inferior de navegação sempre visível.

### Elementos
- **[visor da câmera]** leitura contínua de QR; ao decodificar, dispara a busca e vibra o aparelho.
- **[texto de instrução]** `Aponte para o QR do cartão do aluno.`
- **[botão secundário grande]** `Esqueceu o cartão? Buscar por RM` → abre O3.
- **[navegação inferior]** `Vender` (ativo) · `Catálogo` · `Fechamento`.

### Estados
- **Carregando:** após decodificar, overlay com `Buscando aluno…` para a câmera não ler duas vezes.
- **Vazio:** não se aplica.
- **Erro:**
  - **permissão de câmera negada** → substitui o visor por `Precisamos da câmera para ler o cartão. Autorize nas configurações do navegador.` + o botão de busca por RM como saída;
  - QR não encontrado (404) → toast `Cartão não encontrado. Tente novamente ou busque pelo RM.` e volta a ler;
  - rede → toast `Sem conexão. Verifique a internet.`
- **Sucesso:** navega para O2.

### Observações
A câmera é o caminho principal; a busca por RM é a exceção. **Não há fila offline** (v1.1): sem
internet, o PDV não vende — precisa estar explícito no treinamento da cantina. Manter a tela acordada
enquanto estiver aberta (wake lock) evita o operador destravar o aparelho a cada aluno.

---

## [O2] Vender — pedido

**Rota:** `/venda/:studentId`
**Tipo:** tela
**Acesso:** OPERATOR, ADMIN.
**Objetivo:** montar o que o aluno pediu e cobrar, sabendo antes se pode.

### Chegada e saída
- **Chega de:** O1 (QR lido) · O3 (aluno escolhido por RM).
- **Sai para:** O1 (após concluir ou cancelar).

### Endpoints consumidos
| Endpoint | Quando dispara | Usado para |
|---|---|---|
| `GET /pdv/student?token=` *(ou `…-by-rm`)* | dados já vieram de O1/O3 | aluno, saldo, limite restante, catálogo com `available` e `blocked` |
| `POST /pdv/purchase` | clique em `Confirmar venda` | débito atômico |

### Layout
Faixa superior fixa com a identificação do aluno e o saldo — é a primeira coisa que o operador olha e
precisa continuar visível enquanto monta o pedido. Grade de produtos ocupa o corpo. Rodapé fixo com o
total e o botão de confirmar.

### Elementos
- **[faixa do aluno]** foto (quando houver), nome, turma, **saldo** (`R$ 24,50`) e, quando houver limite, `Ainda pode gastar hoje: R$ 9,00` (de `remainingTodayCents`).
- **[grade de produtos]** botões grandes com nome e preço:
  - normal → toque adiciona 1 ao pedido;
  - `available: false` → **apagado e não clicável**, com etiqueta `Acabou`;
  - `blocked: true` → **marcado com X** e não clicável, com etiqueta `Bloqueado`.
- **[lista do pedido]** itens adicionados com quantidade, `+` / `−` e remoção.
- **[rodapé fixo]** `Total: R$ 11,00` e **[botão primário grande]** `Confirmar venda`.
- **[botão de texto]** `Cancelar` → volta para O1 sem cobrar.

### Estados
- **Carregando:** botão vira `Cobrando…` e a grade bloqueia — evita duplo toque (proteção de UI; o backend já é idempotente por concorrência).
- **Vazio:** catálogo sem produtos → `Nenhum produto cadastrado. Cadastre no Catálogo.`
- **Erro:** cada caso tem mensagem própria, porque o operador precisa saber o que dizer ao aluno:
  - **saldo insuficiente / concorrência (409)** → `Saldo insuficiente. Refaça a leitura do cartão.`
  - **cartão bloqueado (403)** → `Cartão bloqueado. Oriente o aluno a procurar a secretaria.`
  - **item bloqueado (403)** → `Este aluno não pode levar: {itens}.`
  - **limite diário estourado (403)** → `Limite diário do aluno atingido.`
  - **item indisponível (400)** → `"{produto}" está indisponível.`
  - rede → `Sem conexão. A venda não foi registrada.` — texto crítico: o operador precisa saber que **não** cobrou.
- **Sucesso:** tela cheia por ~2s com `Liberado!`, o total e o **novo saldo** (`Novo saldo: R$ 13,50`), e volta sozinha para O1 pronta para o próximo aluno.

### Observações
O saldo e o limite aparecem **antes** de montar o pedido — decisão de produto: nada de o aluno
descobrir na frente da fila que não tem saldo. A tela de sucesso volta sozinha porque a mão do
operador está ocupada entregando o lanche. Todos os preços vêm do servidor; o front nunca calcula
o que será cobrado (só exibe).

---

## [O3] Buscar por RM

**Tipo:** modal
**Acesso:** OPERATOR, ADMIN, a partir de O1.
**Objetivo:** atender quem esqueceu o cartão, sem virar uma lista navegável de alunos.

### Endpoints consumidos
| Endpoint | Quando dispara | Usado para |
|---|---|---|
| `GET /pdv/student-by-rm?rm=` | clique em `Buscar` | localizar um aluno específico |

### Elementos
- **[input numérico]** RM do aluno — placeholder `2026001` — obrigatório; teclado numérico no mobile.
- **[botão primário]** `Buscar`.
- **[resultado]** card com foto (quando houver), nome, turma e saldo + botão `É este aluno` → vai para O2.
- **[botão secundário]** `Cancelar`.

### Estados
- **Carregando:** botão com spinner.
- **Vazio:** RM não encontrado (404) → `RM não encontrado. Confira o número com o aluno.`
- **Erro:** **429** → `Muitas buscas seguidas. Aguarde um minuto.` (o backend limita a 20/min). Rede → `Sem conexão.`
- **Sucesso:** mostra o card do aluno para confirmação visual.

### Observações
É **consulta pontual, nunca busca navegável**: não existe listagem por nome nem autocomplete, de
propósito — evita que o balcão vire um diretório de alunos. A confirmação visual (foto) existe para o
operador ter certeza antes de debitar; hoje `photoUrl` quase sempre virá vazio, porque **não há upload
de foto** (lacuna **L5**). Toda consulta por RM é registrada em log de auditoria no backend.

---

## [O4] Catálogo da cantina

**Rota:** `/catalogo` (PDV) — **compartilhada com o Admin**
**Tipo:** tela
**Acesso:** OPERATOR, ADMIN.
**Objetivo:** manter o que está à venda e o preço certo; marcar o que acabou.

### Chegada e saída
- **Chega de:** barra inferior do PDV (`Catálogo`) · atalho do Início do Admin.
- **Sai para:** permanece na própria tela (edições acontecem em linha e em modal).

### Endpoints consumidos
| Endpoint | Quando dispara | Usado para |
|---|---|---|
| `GET /products` | ao montar | listar o catálogo ativo |
| `POST /products` | salvar no modal de novo produto | criar |
| `PATCH /products/:id` | toggle de disponível, ou salvar edição | atualizar |
| `DELETE /products/:id` | confirmar remoção | soft-delete |

### Layout
Lista simples, uma linha por produto, com o toggle de disponibilidade bem à direita — é a ação mais
frequente do dia (`acabou a coxinha`). Botão de novo produto fixo no topo.

### Elementos
- **[botão primário]** `Novo produto` — abre modal com: **[input texto]** Nome — placeholder `Coxinha` — obrigatório, 1 a 120 caracteres; **[input moeda]** Preço — placeholder `R$ 6,00` — obrigatório, inteiro ≥ 0 em centavos, erro `O preço não pode ser negativo.`
- **[linha de produto]** nome, preço, **[toggle]** `Disponível` (dispara `PATCH` na hora), **[botão ícone]** editar, **[botão ícone]** remover.
- **[modal de remoção]** `Remover "{produto}" do catálogo? Ele deixa de aparecer no PDV. As vendas já feitas continuam no histórico.` + `Remover` / `Cancelar`.

### Filtros e busca
Busca local por nome. O backend não aceita query de busca em `/products`.

### Estados
- **Carregando:** três linhas em esqueleto.
- **Vazio:** `Nenhum produto no catálogo. Cadastre o primeiro para começar a vender.` + `Novo produto`.
- **Erro:** falha no toggle → reverte e mostra `Não foi possível atualizar. Tente de novo.`
- **Sucesso:** toast curto (`Produto salvo`), lista atualizada sem recarregar a tela.

### Observações
`Disponível` é **um interruptor, não estoque**: não há contagem de quantidade (decisão de escopo).
O soft-delete preserva o histórico — por isso o texto do modal fala que as vendas antigas continuam
válidas: o extrato usa snapshot de nome e preço.

---

## [O5] Fechamento do dia

**Rota:** `/fechamento` (PDV) — **compartilhada com o Admin**
**Tipo:** tela
**Acesso:** OPERATOR, ADMIN.
**Objetivo:** saber quanto a cantina vendeu no dia e o que saiu mais.

### Chegada e saída
- **Chega de:** barra inferior do PDV (`Fechamento`) · sidebar do Admin (`Relatório`).
- **Sai para:** permanece.

### Endpoints consumidos
| Endpoint | Quando dispara | Usado para |
|---|---|---|
| `GET /reports/daily?date=` | ao montar e ao trocar a data | totais consolidados |
| `GET /reports/daily/transactions?date=` | ao expandir `Ver todas as vendas` | lista das compras do dia |

### Layout
Seletor de data no topo. Abaixo, três números grandes lado a lado (no mobile, empilhados). Depois, o
ranking por produto. A lista de vendas fica recolhida por padrão — quem abre é quem está conferindo.

### Elementos
- **[seletor de data]** padrão hoje; navegação `‹ dia anterior` / `dia seguinte ›`; formato `13/08/2026`.
- **[cartões de resumo]** `Total vendido` `R$ 40,00` · `Compras` `7` · `Ticket médio` `R$ 5,71`.
- **[tabela por produto]** colunas: Produto, Quantidade, Total — ordenada por Total decrescente.
- **[seção recolhível]** `Ver todas as vendas` → tabela com Horário, Aluno, Turma, Itens, Valor.

### Filtros e busca
Filtro por data (`?date=YYYY-MM-DD`), que é o único aceito pela API.

### Estados
- **Carregando:** números em esqueleto.
- **Vazio:** `Nenhuma venda registrada neste dia.` — sem sugestão de ação, porque não há o que fazer.
- **Erro:** data inválida (400) → `Data inválida.` Rede → `Tentar de novo`.
- **Sucesso:** números e tabelas populados.

### Observações
O "dia" é o dia local do servidor — o deploy precisa rodar com `TZ=America/Sao_Paulo`, senão o
fechamento corta no horário errado. A lista de vendas do dia **não tem paginação** no backend: numa
escola grande, um dia cheio pode devolver centenas de linhas de uma vez (relacionado à lacuna **L3**).
