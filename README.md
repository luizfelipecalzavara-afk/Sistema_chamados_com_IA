# ChamadoIA — Sistema de Suporte com IA

O **ChamadoIA** é um sistema de helpdesk que utiliza inteligência artificial (Google Gemini) para classificar, diagnosticar e, quando possível, resolver automaticamente chamados técnicos sem intervenção humana.

## 🚀 Tecnologias

- **Backend**: Node.js, Express, MySQL 2
- **Frontend**: Vanilla JavaScript (SPA), CSS puro, sem frameworks pesados
- **IA**: `@google/generative-ai` (Gemini 1.5 Flash) com fallback para classificação local.

## ⚙️ Funcionalidades

1. **Abertura de Chamado Simplificada**: O usuário relata o problema em linguagem natural.
2. **Diagnóstico IA (Tempo Real)**: A IA analisa o texto, classifica a categoria (rede, impressora, acesso), detecta o problema e calcula a taxa de confiança.
3. **Orquestrador de Automação**:
   - Nível **Verde** (Automático): Alta confiança da IA, automação dispara e tenta corrigir sozinha.
   - Nível **Amarelo** (Aprovação): Requer clique de "Aprovar" do técnico.
   - Nível **Vermelho** (Manual): IA apenas sugere, requer ação direta de um técnico.
4. **Resolução Contínua**: O sistema executa testes e *valida* se o problema sumiu antes de fechar o chamado.
5. **Integração Real com Banco de Dados**: Todo o fluxo, histórico de cada passo da IA e conversas são persistidos no MySQL.

## 📦 Como rodar localmente

### 1. Requisitos
- Node.js (v18+)
- MySQL (v5.7 ou superior)
- Chave de API do Google Gemini Studio (gratuita)

### 2. Configurar Banco de Dados
Crie um banco de dados vazio:
```sql
CREATE DATABASE chamados_ia;
```

### 3. Instalar e Configurar
```bash
# Instalar dependências
npm install

# Copiar arquivo de ambiente
cp .env.example .env
```
Abra o `.env` e configure suas credenciais do banco e adicione sua `AI_API_KEY` gerada em [aistudio.google.com](https://aistudio.google.com/app/apikey). Se não adicionar a chave, o sistema funcionará com uma IA mock (fallback baseado em palavras-chave).

### 4. Inicializar DB (Tabelas e Seeds)
```bash
node backend/init_db.js
```

### 5. Iniciar o Servidor
```bash
npm start
# ou
node backend/server.js
```
Acesse: [http://localhost:3000](http://localhost:3000)


## Recuperação de senha por e-mail
A edição administrativa não permite mais definir a senha de terceiros. Configure `RESEND_API_KEY`, `EMAIL_FROM` e `APP_URL` no `.env`, execute `node backend/init_db.js` uma vez para criar a tabela de tokens e depois `node backend/server.js`. O link "Esqueci minha senha" envia um token de uso único com validade de 30 minutos. Para envio a destinatários reais, use um remetente/domínio autorizado pelo provedor configurado.

## Atribuição de chamados
Novos chamados são criados explicitamente com `tecnico_id = NULL`. A IA pode diagnosticar e alterar o status, mas não atribui um técnico. A atribuição ocorre somente pela rota autorizada de atribuição/ação "Assumir". Chamados antigos mantêm suas atribuições históricas.
