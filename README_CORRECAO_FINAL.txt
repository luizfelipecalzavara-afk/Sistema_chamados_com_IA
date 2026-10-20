CHAMADOIA - CORRECAO FINAL 20/10/2026

Correcoes desta versao:
1. O orquestrador executa SOMENTE a automacao autorizada pela IA/PermissionService.
2. Problemas de rede usam verificar_conexao_rede e nao entram no fluxo de impressora.
3. Se Gemini retornar acao valida e texto contraditorio 'aguardar tecnico', a orientacao e normalizada para a automacao valida.
4. Administrador possui botao Excluir na lista de Chamados. A API DELETE /api/chamados/:id e protegida por autorizarAdmin.
5. Historico e respostas do chamado excluido sao removidos por ON DELETE CASCADE.

IMPORTANTE: pare qualquer node antigo antes de iniciar esta pasta.
No Windows: Ctrl+C no terminal antigo. Depois execute node backend/server.js nesta pasta.
Acesse http://localhost:3000 e use Ctrl+F5.
