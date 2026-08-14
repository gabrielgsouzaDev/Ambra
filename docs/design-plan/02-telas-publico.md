# Telas — Público / Autenticação

Duas telas, servidas por todas as superfícies. O papel devolvido no login decide o destino.

---

## [P1] Entrar

**Rota:** `/entrar`
**Tipo:** tela
**Acesso:** público. Usuário já autenticado que cair aqui é redirecionado para a home do seu papel.
**Objetivo:** autenticar e mandar a pessoa para a superfície certa.

### Chegada e saída
- **Chega de:** raiz do app sem sessão; expiração do token (401 em qualquer tela); link de "voltar ao início".
- **Sai para:** ADMIN → `/` do Admin · OPERATOR → `/` do PDV · RESPONSAVEL → `/` do Portal.

### Endpoints consumidos
| Endpoint | Quando dispara | Usado para |
|---|---|---|
| `POST /auth/login` | clique em `Entrar` | autenticar e obter o JWT |
| `GET /auth/me` | após o login, ao restaurar a sessão | confirmar o papel e decidir o destino |

### Layout
Tela única centralizada, sem distração. Marca no topo, formulário curto ao centro, aviso de ajuda no
rodapé. No mobile ocupa a tela inteira; o teclado não pode cobrir o botão.

### Elementos
- **[input e-mail]** E-mail — placeholder `voce@escola.com.br` — obrigatório, formato de e-mail. Erro: `E-mail inválido.`
- **[input senha]** Senha — placeholder `••••••••` — obrigatório, mínimo 6 caracteres. Erro: `A senha deve ter no mínimo 6 caracteres.`
- **[botão primário]** `Entrar` — dispara `POST /auth/login`; desabilitado enquanto o formulário for inválido; vira spinner durante a chamada.
- **[texto de apoio]** `Esqueceu a senha? Fale com a secretaria da escola.` — **texto estático, sem link** (ver lacuna **L1**: não existe recuperação self-service).

### Estados
- **Carregando:** botão com spinner e rótulo `Entrando…`; campos bloqueados.
- **Vazio:** não se aplica (formulário).
- **Erro:**
  - credencial errada (401) → alerta acima do formulário: `E-mail ou senha inválidos.` (mensagem genérica de propósito — o backend não revela se o e-mail existe);
  - conta ainda não ativada → cai no mesmo 401; o texto de apoio orienta procurar a escola;
  - **muitas tentativas (429)** → `Muitas tentativas. Aguarde um minuto e tente de novo.` (o backend limita a 10/min);
  - rede/500 → `Não foi possível conectar. Verifique sua internet e tente de novo.` com botão `Tentar de novo`.
- **Sucesso:** redireciona direto para a home do papel, sem tela intermediária.

### Observações
O token vale 1 dia e não há refresh: quando expirar, qualquer 401 devolve para cá com o aviso
`Sua sessão expirou. Entre novamente.` Guardar o token em memória + `localStorage`; não usar cookie
(o backend não usa `credentials` no CORS).

---

## [P2] Ativar conta

**Rota:** `/ativar?token=`
**Tipo:** tela
**Acesso:** público, mas exige um token válido na URL. Serve tanto para responsável quanto para operador.
**Objetivo:** transformar o convite em conta ativa, criando a senha.

### Chegada e saída
- **Chega de:** link do e-mail de convite (`{CORS_ORIGIN}/ativar?token=…`); link repassado pela escola.
- **Sai para:** `/entrar` com aviso de sucesso — ou já autenticado, se optarmos por logar automaticamente (ver Observações).

### Endpoints consumidos
| Endpoint | Quando dispara | Usado para |
|---|---|---|
| `GET /invite/:token` | ao montar a tela | validar o convite e mostrar de quem é |
| `POST /invite/activate` | clique em `Criar senha e entrar` | gravar a senha e ativar a conta |

### Layout
Mesma moldura do login. Acima do formulário, uma saudação com o nome e o e-mail vindos do convite —
é o que dá confiança de que o link é legítimo.

### Elementos
- **[texto]** `Olá, {name}. Crie sua senha para ativar o acesso de {email}.`
- **[input senha]** Nova senha — placeholder `mínimo 8 caracteres` — obrigatório, mínimo 8. Erro: `A senha deve ter no mínimo 8 caracteres.`
- **[input senha]** Confirmar senha — placeholder `repita a senha` — obrigatório, precisa ser igual. Erro: `As senhas não conferem.` *(validação só de front — o backend recebe uma senha só)*
- **[botão primário]** `Criar senha e entrar` — dispara `POST /invite/activate`; desabilitado enquanto inválido.

### Estados
- **Carregando:** enquanto valida o token, esqueleto no lugar da saudação e formulário bloqueado.
- **Vazio:** não se aplica.
- **Erro:**
  - token ausente, inválido, já usado ou expirado (400) → substitui o formulário por: `Este convite não é mais válido. Ele expira em 7 dias e só pode ser usado uma vez. Peça um novo à secretaria da escola.` com botão `Ir para o login`;
  - rede/500 → alerta com `Tentar de novo`.
- **Sucesso:** mensagem `Conta ativada! Você já pode entrar.` e redireciona para `/entrar` em ~2s.

### Observações
O convite é de uso único e expira em 7 dias — a tela precisa deixar isso explícito no estado de erro,
senão o usuário reclama sem entender. **Decisão em aberto:** logar automaticamente após ativar exigiria
uma chamada extra de login com a senha recém-criada; manter o redirecionamento para `/entrar` é mais
simples e é o que está planejado aqui.
