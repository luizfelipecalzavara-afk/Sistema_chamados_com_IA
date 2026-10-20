# Changelog — ChamadoIA

Este arquivo registra decisões, correções e revisões humanas realizadas durante o desenvolvimento com apoio de IA.

## Versão final acadêmica

- Estruturado frontend em HTML/CSS/JavaScript e backend Node.js/Express com MySQL.
- Implementados cadastro, login com JWT e senhas armazenadas com bcrypt.
- Criados perfis de usuário, técnico e administrador e proteção de rotas por perfil.
- Implementado fluxo de abertura, consulta, histórico, respostas, atribuição e acompanhamento de chamados.
- Integrada análise com Google Gemini e fallback local quando a API externa não está configurada/disponível.
- Separada a recomendação da IA da execução: ações passam por camada de permissões, automação e verificação.
- Revisada a atribuição de chamados para que um novo chamado não receba técnico automaticamente; a atribuição humana ocorre posteriormente.
- Revisado o fluxo de senha: o administrador não deve conhecer nem definir diretamente a senha de terceiros; existe estrutura de redefinição por token/e-mail.
- Adicionada automação de diagnóstico de rede ao catálogo, mantendo execução simulada no ambiente acadêmico.
- Identificada em testes uma limitação na automação: nem todos os diagnósticos possuem resolução automática completa. A decisão humana foi manter o encaminhamento para técnico quando a resolução não puder ser confirmada, evitando encerramento incorreto.
- Corrigida a documentação para a porta local 3101 utilizada pela versão final.
- Removida credencial de banco fixa do arquivo de configuração; credenciais passam a depender do `.env`.
- Adicionados `.env.example`, `.gitignore`, `database/schema.sql` e `spec.md` para permitir instalação por terceiros.

## Revisão humana do conteúdo gerado por IA

As sugestões produzidas pelos agentes de IA não foram aceitas automaticamente. Foram revisados manualmente o fluxo de atribuição, permissões administrativas, recuperação de senha, comportamento das automações, segurança das credenciais e documentação. Quando uma automação não conseguiu comprovar a resolução do problema, foi mantida a escalada para atendimento técnico como comportamento seguro.
