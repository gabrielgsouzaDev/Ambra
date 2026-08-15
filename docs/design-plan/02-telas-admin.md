# Telas — Admin (escola)

Superfície da secretaria: desktop, uso pontual e denso. É aqui que a escola entra no ar. Papel `ADMIN`.
Sidebar com 5 itens: `Início`, `Alunos`, `Cartões`, `Operadores`, `Relatório`.

---

## [A1] Início

**Rota:** `/`
**Tipo:** tela
**Acesso:** ADMIN.
**Objetivo:** ver como a cantina está hoje e chegar rápido no que precisa ser feito.

### Chegada e saída
- **Chega de:** login como ADMIN; logo da sidebar.
- **Sai para:** A2, A4, A5, A6, A7, O4 (Catálogo) e O5 (Relatório) pelos atalhos.

### Endpoints consumidos
| Endpoint | Quando dispara | Usado para |
|---|---|---|
| `GET /reports/daily` | ao montar | resumo do dia (total, compras, ticket médio) |
| `GET /students` | ao montar | contagem de alunos cadastrados |

### Layout
Resumo do dia no topo, em três números. Abaixo, uma faixa de atalhos para as tarefas de onboarding.
Nada de gráficos: a escola quer números e caminhos curtos.

### Elementos
- **[cartões de resumo]** `Vendido hoje` · `Compras hoje` · `Alunos cadastrados`.
- **[atalhos]** `Cadastrar aluno` (A4) · `Importar CSV` (A5) · `Gerar cartões` (A6) · `Gerenciar catálogo` (O4) · `Ver relatório` (O5).
- **[sidebar]** `Início` (ativo) · `Alunos` · `Cartões` · `Operadores` · `Relatório`; rodapé com nome do usuário e `Sair`.

### Estados
- **Carregando:** números em esqueleto.
- **Vazio:** com zero alunos, os atalhos dão lugar a um bloco de primeiros passos: `Comece cadastrando os alunos — importe uma planilha ou cadastre um a um.`
- **Erro:** falha em um dos blocos não derruba o outro; cada cartão mostra `—` com `Tentar de novo`.
- **Sucesso:** números do dia populados.

### Observações
A contagem de alunos usa o campo `total` de `GET /students?limit=1` — o envelope de paginação já traz
o total, então não é preciso baixar a lista inteira só para contar.

---

## [A2] Alunos

**Rota:** `/alunos`
**Tipo:** tela
**Acesso:** ADMIN.
**Objetivo:** encontrar um aluno e chegar no que precisa fazer com ele.

### Chegada e saída
- **Chega de:** sidebar (`Alunos`); após cadastrar (A4) ou importar (A5).
- **Sai para:** A3 (linha da tabela) · A4 (`Cadastrar aluno`) · A5 (`Importar CSV`).

### Endpoints consumidos
| Endpoint | Quando dispara | Usado para |
|---|---|---|
| `GET /students` | ao montar | popular a tabela |

### Layout
Cabeçalho com título, campo de busca e os dois botões de criação. Corpo é uma tabela densa.

### Elementos
- **[input busca]** placeholder `Buscar por nome ou RM` — vai para `?q` na API (com debounce).
- **[botão primário]** `Cadastrar aluno` → A4.
- **[botão secundário]** `Importar CSV` → A5.
- **[tabela]** colunas: Nome, Turma, RM, Cadastrado em. Clique na linha → A3.
- **[paginação]** `Anterior` / `Próxima` com `Mostrando 1–25 de 412` (vem de `total` e `hasNext`).

### Filtros e busca
Busca **no servidor** por nome ou RM (`?q`), com paginação (`?page`, `?limit`). A tabela mostra
`Mostrando 1–25 de 412` e navega por `Anterior` / `Próxima` — nada é baixado além da página atual,
então uma escola de 400+ alunos abre instantâneo.

### Estados
- **Carregando:** cinco linhas em esqueleto.
- **Vazio:** `Nenhum aluno cadastrado ainda. Importe a planilha da escola ou cadastre o primeiro aluno.` + os dois botões.
- **Vazio na busca:** `Nenhum aluno encontrado para "{termo}".` + `Limpar busca`.
- **Erro:** `Não foi possível carregar os alunos.` + `Tentar de novo`.
- **Sucesso:** tabela populada.

### Observações
A tabela é o ponto de entrada de quase toda tarefa do Admin. No mobile (uso raro aqui) as linhas viram
cards com Nome, Turma e RM.

---

## [A3] Aluno — detalhe

**Rota:** `/alunos/:id`
**Tipo:** tela
**Acesso:** ADMIN. ID inexistente → tela de `Aluno não encontrado` com link para A2.
**Objetivo:** resolver qualquer pendência daquele aluno: cartão, responsáveis, saldo e limite.

### Chegada e saída
- **Chega de:** A2 (linha) · A4 e A5 (após criar).
- **Sai para:** A2 (voltar) · A6 (`Gerar cartão`).

### Endpoints consumidos
| Endpoint | Quando dispara | Usado para |
|---|---|---|
| `GET /students/:id` | ao montar | dados, `qrToken` e responsáveis |
| `GET /students/:id/wallet` | ao montar | saldo e limite diário |
| `POST /students/:id/card/block` | clique em `Bloquear cartão` (com confirmação) | bloquear |
| `POST /students/:id/card/unblock` | clique em `Desbloquear cartão` | desfazer o bloqueio mantendo o QR |
| `POST /students/:id/card/reissue` | clique em `Reemitir cartão` (com confirmação) | gerar novo QR |
| `PATCH /students/:id/photo` | salvar a URL da foto | definir/remover a foto do aluno |
| `POST /onboarding/guardians/:id/invite` | clique em `Reenviar convite` | reenviar ativação ao responsável |
| `PATCH /students/:id/daily-limit` | salvar o limite | definir limite pela escola |

### Layout
Cabeçalho com nome, turma e RM. Quatro blocos: `Carteira`, `Cartão`, `Responsáveis` e `Ações`.

### Elementos
**Carteira**
- **[texto]** `Saldo: R$ 24,50` · `Limite diário: R$ 15,00` ou `sem limite`.
- **[input moeda + botão]** alterar limite diário — inteiro ≥ 0. Erro: `Informe um valor válido.`

**Cartão**
- **[texto de estado]** `Cartão ativo` / `Cartão bloqueado`.
- **[botão destrutivo]** `Bloquear cartão` — só quando ativo → modal: `Bloquear o cartão de {nome}? Ele para de funcionar imediatamente.`
- **[botão]** `Desbloquear cartão` — só quando bloqueado. Mantém o **mesmo QR**, então não exige reimpressão. Texto de apoio: `O cartão volta a funcionar com o mesmo QR — use quando o bloqueio foi por engano ou o cartão apareceu.`
- **[botão]** `Reemitir cartão` → modal: `Reemitir gera um QR novo e invalida o cartão atual. Será preciso imprimir e entregar o cartão novo. Confirmar?`
- **[botão]** `Gerar cartão em PDF` → A6 já filtrado por este aluno *(ver Observações)*.

**Foto** (opcional, LGPD)
- **[input url]** URL da foto — placeholder `https://…/ana.jpg` — opcional, precisa ser URL http(s). Erro: `Informe uma URL de imagem válida.`
- **[texto de apoio]** `A foto aparece para o operador quando o aluno esquece o cartão. É opcional — só use com consentimento.`
- **[botão]** `Salvar foto` · **[botão de texto]** `Remover foto`.

**Responsáveis** (1 a 2)
- **[lista]** por responsável: nome, e-mail e etiqueta de status — `Ativo` ou `Convite pendente`.
- **[botão por linha]** `Reenviar convite` — só aparece em quem está `PENDING`. Ao responder, mostra o link de ativação com **[botão]** `Copiar link` — necessário porque, sem `RESEND_KEY` configurada, o e-mail não é enviado e a escola precisa repassar o link manualmente.

### Estados
- **Carregando:** blocos em esqueleto, independentes.
- **Vazio:** não se aplica (aluno sempre tem ao menos 1 responsável, garantido no cadastro).
- **Erro:** 404 → `Aluno não encontrado.` + voltar. Falha em ação → toast com o motivo e nada é alterado na tela.
- **Sucesso:** após reemitir, a tela mostra `Cartão reemitido. Imprima o novo cartão.` e atualiza o estado.

### Permissões dentro da tela
Só ADMIN chega aqui. O responsável tem uma visão equivalente e reduzida em R2/R5, sem `qrToken` e sem
reemissão.

### Observações
O `qrToken` **não é exibido como texto** — é credencial de posse. Ele existe na resposta e é usado só
para gerar o PDF. Bloquear e desbloquear preservam o QR; só a **reemissão** o troca (e aí exige
reimpressão) — a tela precisa deixar essa diferença clara, senão a escola reemite sem necessidade.
A foto recebe uma **URL já hospedada**: o upload de arquivo depende de uma decisão de armazenamento
ainda em aberto (provavelmente Supabase Storage).

---

## [A4] Cadastrar aluno

**Rota:** `/alunos/novo`
**Tipo:** tela
**Acesso:** ADMIN.
**Objetivo:** cadastrar um aluno com seus responsáveis numa tacada — é assim que o backend garante que nenhum aluno fica sem responsável.

### Chegada e saída
- **Chega de:** A2 (`Cadastrar aluno`) · A1 (atalho).
- **Sai para:** A3 do aluno recém-criado.

### Endpoints consumidos
| Endpoint | Quando dispara | Usado para |
|---|---|---|
| `POST /students` | clique em `Cadastrar aluno` | criar aluno + responsáveis + vínculo, numa transação |

### Layout
Formulário em duas seções: `Dados do aluno` e `Responsáveis`. O segundo responsável começa recolhido.

### Elementos
**Dados do aluno**
- **[input texto]** Nome — placeholder `Ana Souza` — obrigatório, 2 a 120 caracteres. Erro: `Informe o nome do aluno (2 a 120 caracteres).`
- **[input texto]** Turma — placeholder `5A` — opcional, até 60 caracteres.
- **[input texto]** RM — placeholder `2026001` — obrigatório, 1 a 30 caracteres. Erro: `Informe o RM.`

**Responsáveis** — mínimo 1, máximo 2
- **[input texto]** Nome do responsável — placeholder `João Souza` — obrigatório, 2 a 120. Erro: `Informe o nome do responsável.`
- **[input e-mail]** E-mail do responsável — placeholder `joao@email.com` — obrigatório, formato de e-mail. Erro: `E-mail do responsável inválido.`
- **[botão de texto]** `Adicionar segundo responsável` — aparece só uma vez (o máximo é 2).
- **[botão de texto]** `Remover` no segundo responsável.
- **[texto de apoio]** `Cada responsável recebe um convite para criar a senha e acompanhar o saldo.`
- **[botão primário]** `Cadastrar aluno`.
- **[botão de texto]** `Cancelar` → A2, com confirmação se houver dados preenchidos.

### Estados
- **Carregando:** botão vira `Cadastrando…`.
- **Vazio:** não se aplica.
- **Erro:**
  - **RM já existe (409)** → erro no campo RM: `Já existe um aluno com este RM nesta escola.`
  - **e-mail repetido entre os dois responsáveis (400)** → `Os dois responsáveis não podem ter o mesmo e-mail.`
  - **e-mail pertence a um Admin/Operador (400)** → `Este e-mail já pertence a uma conta que não é de responsável.`
  - validação de campo → mensagem embaixo do próprio campo.
- **Sucesso:** vai para A3 com aviso `Aluno cadastrado. Convites enviados aos responsáveis.` — e, quando o e-mail não estiver configurado, exibe os links de ativação para copiar.

### Observações
A trava de 1 a 2 responsáveis é do backend (`ArrayMinSize`/`ArrayMaxSize`) — o formulário só reflete.
Cadastrar aluno e responsável junto não é conveniência: é o que garante a regra "nenhum aluno sem
responsável".

---

## [A5] Importar CSV

**Rota:** `/importar`
**Tipo:** tela
**Acesso:** ADMIN.
**Objetivo:** colocar a escola inteira no ar de uma vez, e entender exatamente o que falhou.

### Chegada e saída
- **Chega de:** A2 (`Importar CSV`) · A1 (atalho).
- **Sai para:** A2 (`Ver alunos`) após a importação.

### Endpoints consumidos
| Endpoint | Quando dispara | Usado para |
|---|---|---|
| `POST /onboarding/import` | clique em `Importar` | processar o CSV linha a linha |

### Layout
Instruções e modelo no topo; área de upload no centro; **relatório do resultado** ocupando a tela
depois do envio — é a parte mais importante da tela, não um rodapé.

### Elementos
- **[bloco de instruções]** colunas exatas, na ordem: `nome, turma, rm, responsavel1_nome, responsavel1_email, responsavel2_nome, responsavel2_email`. Texto: `Uma linha por aluno. As colunas do segundo responsável podem ficar vazias. Máximo de 2.000 linhas por arquivo.`
- **[botão de texto]** `Baixar modelo (.csv)` — arquivo estático gerado no front.
- **[área de upload]** arrastar ou selecionar `.csv`; o front lê o arquivo como texto e envia em `{ csv }` (o backend recebe JSON, não multipart).
- **[botão primário]** `Importar` — desabilitado sem arquivo.
- **[relatório do resultado]** três números: `Linhas lidas`, `Alunos criados`, `Falhas` + tabela de falhas com colunas **Linha**, **RM**, **Motivo** (ex.: `4 · 3003 · Informe ao menos 1 responsável.`).
- **[botão]** `Copiar falhas` — para a secretaria corrigir na planilha.

### Estados
- **Carregando:** barra de progresso indeterminada com `Importando… não feche esta página.` — a operação processa linha a linha e pode demorar.
- **Vazio:** antes do envio, área de upload com `Nenhum arquivo selecionado.`
- **Erro:**
  - **acima de 2.000 linhas (400)** → `Importação limitada a 2.000 linhas por vez. Divida o arquivo.`
  - CSV vazio (400) → `O arquivo está vazio.`
  - rede → `A importação não foi concluída. Verifique a lista de alunos antes de tentar de novo.` — texto cuidadoso: parte das linhas pode ter sido criada.
- **Sucesso:** relatório visível com `12 de 14 alunos criados` e botão `Ver alunos`.

### Observações
O import **não é tudo-ou-nada**: linhas boas entram, linhas ruins são reportadas. É idempotente por RM
— reimportar o mesmo arquivo não duplica, as linhas repetidas caem como falha `Já existe um aluno com
este RM`. Isso precisa estar dito na tela, senão a escola acha que quebrou.

---

## [A6] Cartões

**Rota:** `/cartoes`
**Tipo:** tela
**Acesso:** ADMIN.
**Objetivo:** gerar o PDF dos cartões para imprimir e distribuir.

### Chegada e saída
- **Chega de:** sidebar (`Cartões`) · A1 (atalho) · A3 (`Gerar cartão em PDF`).
- **Sai para:** permanece; o resultado é um download.

### Endpoints consumidos
| Endpoint | Quando dispara | Usado para |
|---|---|---|
| `GET /onboarding/cards.pdf` | clique em `Gerar PDF` | baixar a folha de cartões |
| `GET /students` | ao montar | montar a lista de turmas disponíveis |

### Layout
Tela curta: explicação, seletor de turma, botão de gerar.

### Elementos
- **[texto explicativo]** `Cada cartão traz o nome, a turma e o QR do aluno. Imprima, recorte e entregue. O QR é o que identifica o aluno no balcão.`
- **[select]** Turma — opções derivadas das turmas existentes em `GET /students` + opção `Todas as turmas`.
- **[aviso]** `Máximo de 500 cartões por PDF. Se a escola for maior, gere por turma.`
- **[botão primário]** `Gerar PDF` — dispara o download de `cartoes-ambra.pdf`.

### Estados
- **Carregando:** botão vira `Gerando PDF…` — a geração desenha um QR por aluno e leva alguns segundos.
- **Vazio:** sem alunos → `Cadastre alunos antes de gerar os cartões.` + link para A4.
- **Erro:** falha → `Não foi possível gerar o PDF. Tente de novo.`
- **Sucesso:** download inicia; mensagem `PDF gerado. Confira os cartões antes de imprimir.`

### Observações
Reemitir o cartão de um aluno (A3) **invalida o QR antigo** — o PDF precisa ser gerado de novo para
aquele aluno. Não há como gerar o PDF de um aluno só hoje: o filtro disponível é por turma. Vale
registrar como melhoria (`?studentId=`), não como lacuna bloqueante.

---

## [A7] Operadores

**Rota:** `/operadores`
**Tipo:** tela
**Acesso:** ADMIN.
**Objetivo:** dar acesso ao PDV para quem trabalha na cantina.

### Chegada e saída
- **Chega de:** sidebar (`Operadores`).
- **Sai para:** permanece; a criação acontece em modal.

### Endpoints consumidos
| Endpoint | Quando dispara | Usado para |
|---|---|---|
| `GET /operators` | ao montar | listar operadores (paginado, `?q` para buscar) |
| `POST /operators` | salvar no modal | criar operador + convite |
| `POST /onboarding/operators/:id/invite` | clique em `Reenviar convite` | gerar e reenviar o link de ativação |

### Layout
Lista simples com botão de criação no topo.

### Elementos
- **[botão primário]** `Novo operador` — abre modal com: **[input texto]** Nome — placeholder `Cantina Central` — obrigatório, 2 a 120; **[input e-mail]** E-mail — placeholder `cantina@escola.com.br` — obrigatório. Erro: `E-mail do operador inválido.`
- **[tabela]** colunas: Nome, E-mail, Status (`Ativo` / `Convite pendente`), Criado em.
- **[botão por linha]** `Reenviar convite` — só em quem está `Convite pendente`; ao responder, mostra o link com `Copiar link`.
- **[bloco pós-criação]** exibe o **link de ativação** com `Copiar link` e o texto: `Envie este link ao operador. Ele expira em 7 dias e só pode ser usado uma vez.`

### Estados
- **Carregando:** três linhas em esqueleto.
- **Vazio:** `Nenhum operador cadastrado. Crie o acesso de quem vai atender no balcão.` + `Novo operador`.
- **Erro:** **e-mail já em uso (409)** → `Já existe uma conta com este e-mail.` no campo.
- **Sucesso:** operador aparece na lista como `Convite pendente` e o link fica visível para copiar.

### Observações
O link de ativação é mostrado **na tela** porque o envio por e-mail depende de `RESEND_KEY`, que pode
não estar configurada — sem isso, o operador nunca receberia o convite. Perder o link é comum, por
isso o reenvio existe e gera um token novo (o anterior deixa de valer).

---

## [A8] Responsáveis

**Rota:** `/responsaveis`
**Tipo:** tela
**Acesso:** ADMIN.
**Objetivo:** ver quem ainda não ativou a conta e destravar essas pessoas — é o gargalo do onboarding.

### Chegada e saída
- **Chega de:** sidebar (`Responsáveis`) · A1 (atalho, quando houver pendentes).
- **Sai para:** A3 (clique num dependente listado).

### Endpoints consumidos
| Endpoint | Quando dispara | Usado para |
|---|---|---|
| `GET /guardians` | ao montar e ao trocar o filtro | listar responsáveis com seus dependentes |
| `POST /onboarding/guardians/:id/invite` | clique em `Reenviar convite` | gerar e reenviar o link |

### Layout
Filtro de status no topo (com `Convite pendente` pré-selecionado — é o motivo de a tela existir),
busca ao lado, e a tabela abaixo.

### Elementos
- **[abas ou select]** `Convite pendente` (padrão) · `Ativos` · `Todos` — vira `?status=`.
- **[input busca]** placeholder `Buscar por nome ou e-mail` — vira `?q=`.
- **[tabela]** colunas: Nome, E-mail, Dependentes (nomes, clicáveis → A3), Status, Cadastrado em.
- **[botão por linha]** `Reenviar convite` — só em quem está pendente; ao responder, mostra o link com `Copiar link`.
- **[paginação]** `Anterior` / `Próxima` com `Mostrando 1–25 de 137`.

### Filtros e busca
Ambos vão para a API (`?status`, `?q`, `?page`, `?limit`) — a listagem é paginada no servidor.

### Estados
- **Carregando:** cinco linhas em esqueleto.
- **Vazio (pendentes):** `Nenhum convite pendente — todos os responsáveis já ativaram a conta.` — boa notícia, e o texto diz isso.
- **Vazio (busca):** `Nenhum responsável encontrado para "{termo}".`
- **Erro:** `Não foi possível carregar os responsáveis.` + `Tentar de novo`.
- **Sucesso:** tabela populada; após reenviar, a linha mostra o link para copiar.

### Observações
Esta tela existe por um motivo operacional concreto: o pai que não ativa a conta **não recarrega**, e
sem recarga não há receita. Ver a lista de pendentes num lugar só é o que permite à escola cobrar
essas ativações — antes, só dava para descobrir entrando aluno por aluno.
