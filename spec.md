# SPEC FINAL — ChamadoIA

## 1. Objetivo

O ChamadoIA é um sistema web acadêmico de gerenciamento de chamados de suporte de TI. O sistema permite registrar, acompanhar e atender chamados e usa Inteligência Artificial como apoio para classificar e diagnosticar problemas, recomendar ações e participar de um fluxo controlado de automação e verificação.

## 2. Usuários

- **Usuário comum:** cadastra-se, entra no sistema, abre e acompanha chamados, consulta histórico e respostas e gerencia o próprio perfil.
- **Técnico:** consulta chamados que necessitam atendimento, analisa o diagnóstico da IA, assume chamados e realiza ações de atendimento.
- **Administrador:** acessa métricas, chamados, usuários e funções administrativas protegidas.

## 3. Casos de uso principais

1. Cadastrar e autenticar usuário.
2. Abrir chamado descrevendo um problema de TI.
3. Classificar/diagnosticar o chamado com Gemini ou fallback local.
4. Registrar diagnóstico, recomendação e eventos no histórico.
5. Verificar se uma ação automática é permitida.
6. Executar automação simulada quando aplicável e verificar o resultado.
7. Encaminhar para técnico quando não houver confirmação segura de resolução.
8. Técnico assumir e atender chamado.
9. Administrador consultar métricas e gerenciar usuários.
10. Usuário acompanhar respostas, histórico e situação do chamado.

## 4. Requisitos funcionais

- RF01 — Cadastro e login de usuários.
- RF02 — Controle de acesso por perfil: usuário, técnico e administrador.
- RF03 — Criação e consulta de chamados persistidos em MySQL.
- RF04 — Registro de categoria, prioridade, status, SLA, solicitante e técnico quando atribuído.
- RF05 — Análise de chamados por IA e fallback local.
- RF06 — Histórico de eventos e respostas.
- RF07 — Painel de atendimento técnico.
- RF08 — Painel administrativo e gerenciamento de usuários.
- RF09 — Camada de permissões antes das automações.
- RF10 — Verificação pós-ação antes de considerar uma resolução automática.
- RF11 — Recuperação de senha baseada em token, com envio por e-mail quando o serviço externo estiver configurado.

## 5. Requisitos não funcionais e segurança

- Credenciais e chaves externas devem ser configuradas por variáveis de ambiente.
- O arquivo `.env` não deve ser versionado; apenas `.env.example` deve estar no repositório.
- Senhas de usuários são armazenadas com hash bcrypt.
- Consultas que recebem dados de usuário utilizam parâmetros no backend.
- Rotas protegidas utilizam autenticação JWT e autorização por perfil.
- A IA não executa comandos arbitrários diretamente; recomendações passam por permissões e serviços de automação.

## 6. Decisão de stack

- **Frontend:** HTML5, CSS e JavaScript puro (SPA).
- **Backend:** Node.js + Express.
- **Banco:** MySQL, acessado com `mysql2/promise`.
- **Autenticação:** JSON Web Token (`jsonwebtoken`) e bcrypt.
- **IA:** Google Gemini via `@google/generative-ai`, com fallback local.
- **E-mail opcional:** integração via API Resend.

As dependências e versões usadas pelo projeto estão registradas em `package.json` e `package-lock.json`.

## 7. Modelo de dados

| Tabela | Campos principais | Chave primária | Relacionamentos |
|---|---|---|---|
| `setores` | id, nome, ativo, created_at | id | — |
| `categorias` | id, nome, descricao, ativo, created_at | id | — |
| `prioridades` | id, nome, sla_horas, ativo | id | — |
| `usuarios` | id, nome, email, senha, setor, tipo, avatar, ativo | id | — |
| `tecnicos` | id, user_id, nome, especialidade, avatar, ativo | id | `user_id` é usado para vincular o técnico à conta; a versão atual não declara FK nesse campo |
| `automacoes_catalogo` | id, nome, descricao, nivel, categoria, ativo | id | — |
| `chamados` | id, numero, usuario_id, tecnico_id, titulo, descricao, categoria, prioridade, status, sla, diagnostico | id | usuario_id → usuarios.id; tecnico_id → tecnicos.id |
| `password_reset_tokens` | id, usuario_id, token_hash, expira_em, usado_em | id | usuario_id → usuarios.id |
| `historico_eventos` | id, chamado_id, tipo, descricao, autor, timestamp | id | chamado_id → chamados.id |
| `respostas` | id, chamado_id, autor_id, autor_nome, mensagem, criado_em | id | chamado_id → chamados.id |

O arquivo `database/schema.sql` cria o banco, as tabelas e dados iniciais. O script `backend/init_db.js` também pode inicializar/migrar o banco.

## 8. Critérios de aceite

- O sistema inicia sem depender de edição do código-fonte para credenciais.
- Um usuário consegue cadastrar-se, entrar e abrir um chamado.
- O chamado é salvo no MySQL e pode ser consultado posteriormente.
- O diagnóstico da IA/fallback aparece no fluxo do chamado.
- O histórico registra os principais eventos.
- Perfis diferentes recebem permissões diferentes.
- Um técnico consegue acessar o fluxo de atendimento.
- Um administrador consegue acessar funções administrativas.
- Quando a automação não confirma a resolução, o sistema pode encaminhar o chamado para técnico em vez de encerrá-lo incorretamente.

# 9. Instalação e execução

## 9.1 Ambiente

- **Linguagem/runtime:** Node.js. A versão final foi executada com Node.js 22; recomenda-se Node.js 20 ou superior.
- **Servidor local:** Express, iniciado com `npm start` ou `node backend/server.js`.
- **Dependências:** definidas em `package.json`; instalar com `npm install`.
- **Banco:** MySQL. Recomenda-se MySQL 8; o código utiliza recursos compatíveis com MySQL 5.7+ (incluindo JSON).
- **Sistema operacional usado nos testes finais:** Windows.

## 9.2 Banco de dados

- **SGBD:** MySQL.
- **Banco padrão:** `chamados_ia`.
- **Script SQL:** `database/schema.sql`.
- **Inicializador alternativo:** `node backend/init_db.js`.

### Importação pelo terminal MySQL

```bash
mysql -u root -p < database/schema.sql
```

Informe a senha local do MySQL quando solicitada.

Também é possível abrir `database/schema.sql` no MySQL Workbench/phpMyAdmin e executar todo o script.

Depois da criação do banco, execute o seed de contas de teste:

```bash
npm run seed
```

## 9.3 Variáveis de ambiente

Copie `.env.example` para `.env`. No Windows, pode copiar o arquivo pelo Explorador; no terminal:

```bash
copy .env.example .env
```

Principais variáveis:

| Variável | Finalidade |
|---|---|
| `CHAMADOIA_PORT` | Porta HTTP local. Padrão da versão final: 3101. |
| `APP_URL` | URL base usada pelo sistema e por links de e-mail. Local: `http://localhost:3101`. |
| `DB_HOST` | Host do MySQL. Localmente: `localhost`. |
| `DB_PORT` | Porta do MySQL. Normalmente: `3306`. |
| `DB_USER` | Usuário do MySQL local. |
| `DB_PASSWORD` | Senha do usuário MySQL local. |
| `DB_NAME` | Banco utilizado pelo sistema: `chamados_ia`. |
| `JWT_SECRET` | Segredo privado usado para assinar tokens de autenticação. Use um valor longo e não publique o valor real. |
| `AI_API_KEY` | Chave da API Gemini. É opcional para execução básica; sem ela o sistema utiliza fallback local. |
| `AI_MODEL` | Modelo Gemini solicitado pelo backend. |
| `AI_CONFIDENCE_AUTO` | Limite de confiança para decisões automáticas. |
| `AI_CONFIDENCE_REVIEW` | Limite de confiança para revisão. |
| `RESEND_API_KEY` | Chave opcional para envio real de e-mail. |
| `EMAIL_FROM` | Remetente autorizado no serviço de e-mail. |

## 9.4 Passo a passo completo

1. Clonar o repositório:

```bash
git clone https://github.com/luizfelipecalzavara-afk/Sistema_chamados_com_IA.git
cd Sistema_chamados_com_IA
```

2. Instalar as dependências:

```bash
npm install
```

3. Garantir que o MySQL esteja iniciado.

4. Criar as tabelas importando o script:

```bash
mysql -u root -p < database/schema.sql
```

Como alternativa, após configurar o `.env`, pode-se usar:

```bash
npm run init-db
```

5. Copiar `.env.example` para `.env` e preencher `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT`, `DB_NAME` e `JWT_SECRET`. `AI_API_KEY` é necessária somente para testar Gemini real.

6. Garantir as contas fictícias de teste:

```bash
npm run seed
```

7. Iniciar o servidor:

```bash
npm start
```

8. Abrir no navegador:

`http://localhost:3101`

Não abra `index.html` diretamente e não use Live Server; o frontend depende da API Node.js.

## 9.5 Como testar

Após `npm run seed`, podem ser utilizadas contas fictícias:

- **Administrador:** `carlos@empresa.com` / `admin123`
- **Técnico:** `rafael@empresa.com` / `admin123`
- **Usuário comum:** `joao@empresa.com` / `admin123`

### Roteiro principal

1. Entrar como usuário comum.
2. Criar um novo chamado descrevendo um problema de TI.
3. Abrir os detalhes e observar diagnóstico, categoria, confiança/recomendação e histórico.
4. Quando houver necessidade de atendimento humano, entrar como técnico e consultar/assumir o chamado.
5. Entrar como administrador para visualizar o painel e o gerenciamento de usuários.

### Testes automatizados disponíveis

O projeto inclui `backend/test_admin_suite.js` e `backend/test_chamados_lifecycle.js`. O script `npm test` executa a suíte administrativa configurada no `package.json`.

## 9.6 Problemas conhecidos e limitações

O ChamadoIA é um MVP acadêmico. A análise de IA está integrada ao fluxo, mas as automações de infraestrutura são simuladas e nem todos os tipos de problema possuem uma resolução automática completa. Em testes de problemas de rede, a resolução automática pode não ser confirmada e o chamado pode terminar como “Técnico necessário”. Esse comportamento deve ser interpretado como escalada segura: o sistema não deve marcar como resolvido algo que não conseguiu verificar.

A integração real com Gemini depende de uma `AI_API_KEY` válida e acesso à internet. O envio real de e-mail depende da configuração do serviço externo. Sem a chave Gemini, o sistema utiliza o fallback local.

## 10. Publicação

A versão publicada deve configurar no provedor de hospedagem as mesmas variáveis de ambiente, utilizando credenciais do banco de dados em nuvem e uma `JWT_SECRET` privada. Nenhuma credencial real deve ser adicionada ao GitHub. O link público final deve ser registrado no repositório após a publicação.
