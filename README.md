# Sistema de Chamado com IA

Sistema de suporte de TI com Inteligência Artificial desenvolvido como um MVP para automatizar o diagnóstico e a resolução de problemas técnicos repetitivos.

A proposta é utilizar IA para analisar chamados, identificar possíveis soluções, executar automações autorizadas e verificar se o problema realmente foi resolvido. Quando a automação não for suficiente, o chamado é encaminhado para um técnico.

## Fluxo principal

```text
Usuário abre chamado
        ↓
IA analisa o problema
        ↓
Diagnóstico
        ↓
Verificação de permissões
        ↓
Automação autorizada
        ↓
Execução
        ↓
Verificação do resultado
        ↓
 ┌───────────────┐
 │               │
Sucesso        Falha
 │               │
 ↓               ↓
Resolvido     Técnico
```

O diferencial do projeto está no ciclo:

**Diagnosticar → Automatizar → Testar → Resolver ou Encaminhar**

A execução de uma automação não encerra automaticamente o chamado. O sistema precisa verificar o resultado antes de considerar o problema resolvido.

## Problema

Equipes de suporte de TI frequentemente precisam lidar com chamados simples e repetitivos, como problemas de impressão, conexão e acesso.

Essas tarefas podem consumir tempo dos técnicos e aumentar o tempo de espera dos usuários.

O projeto busca utilizar inteligência artificial e automação para reduzir esse trabalho repetitivo e permitir que os técnicos se concentrem em situações que realmente necessitam de intervenção humana.

## Solução

O sistema permite que o usuário abra um chamado descrevendo seu problema.

A IA analisa a descrição e gera um diagnóstico estruturado, identificando:

* Categoria do problema;
* Problema identificado;
* Diagnóstico;
* Nível de confiança;
* Ação sugerida;
* Possibilidade de automação.

A partir desse diagnóstico, o sistema verifica as permissões e seleciona uma automação previamente definida.

Após a execução, uma etapa de verificação determina se o problema foi realmente solucionado.

## Exemplo

Um usuário pode abrir um chamado informando:

> "Minha impressora não imprime."

O sistema poderá:

1. Receber o chamado;
2. Analisar a descrição com IA;
3. Identificar o problema como relacionado à impressão;
4. Verificar as automações disponíveis;
5. Validar as permissões;
6. Verificar a fila de impressão;
7. Executar uma automação autorizada;
8. Testar novamente;
9. Encerrar o chamado caso o problema tenha sido resolvido;
10. Encaminhar para um técnico caso o problema persista.

## Inteligência Artificial

A IA é utilizada principalmente para análise e diagnóstico dos chamados.

Ela não possui acesso direto ao sistema operacional e não executa comandos arbitrários.

O fluxo de segurança é:

```text
IA
 ↓
Diagnóstico
 ↓
Ação sugerida
 ↓
Orquestrador
 ↓
Permissões
 ↓
Automação previamente definida
 ↓
Execução
```

Dessa forma, a IA não pode simplesmente transformar uma solicitação em um comando e executá-lo diretamente.

## Automações

O MVP possui como foco inicial problemas relacionados a impressoras.

Entre as automações planejadas estão:

* Verificação da impressora;
* Verificação da fila de impressão;
* Limpeza da fila de impressão;
* Verificação do serviço de impressão;
* Teste de impressão.

Quando não houver um ambiente adequado para execução real, as automações podem utilizar um executor simulado, deixando a arquitetura preparada para futuras implementações reais.

## Tecnologias

A arquitetura do projeto utiliza:

* **Node.js** — Backend
* **MySQL** — Banco de dados
* **MySQL Workbench** — Gerenciamento do banco
* **API REST** — Comunicação entre frontend e backend
* **Serviço de IA** — Análise e diagnóstico dos chamados

A tecnologia específica do frontend segue a estrutura existente do projeto.

## Arquitetura

```text
Frontend
   ↓
API
   ↓
Backend Node.js
   ↓
Ticket Orchestrator
   ├── AI Service
   ├── Permission Service
   ├── Automation Service
   └── Verification Service
   ↓
MySQL
```

## Principais funcionalidades

* Cadastro de usuários;
* Cadastro de técnicos;
* Criação de chamados;
* Número único para cada chamado;
* Categorias;
* Prioridades;
* Status dos chamados;
* Diagnóstico por IA;
* Controle de permissões;
* Automações;
* Verificação de resultados;
* Encaminhamento para técnicos;
* Respostas nos chamados;
* Histórico de eventos;
* SLA;
* Reabertura de chamados;
* Persistência em banco de dados.

## Segurança

A arquitetura foi projetada para impedir que a IA execute comandos arbitrários.

As automações são previamente definidas e controladas pelo backend.

Antes de executar uma automação, o sistema deve verificar:

* A ação solicitada;
* A existência da automação;
* O nível de risco;
* As permissões;
* A necessidade de aprovação;
* Se a execução automática é permitida.

Todas as execuções devem ser registradas.

## Status do projeto

**MVP em desenvolvimento.**

O projeto está sendo desenvolvido inicialmente com foco em problemas recorrentes de impressão.

A arquitetura foi planejada para permitir futuras expansões para outros problemas de TI, como:

* Rede;
* VPN;
* Serviços do Windows;
* Acesso;
* Outros problemas de infraestrutura.

## Objetivo futuro

A longo prazo, o sistema poderá ampliar sua capacidade de diagnóstico e automação, permitindo que diferentes tipos de problemas de TI sejam analisados e tratados automaticamente, mantendo a intervenção humana nos casos que exigirem um técnico.

## Execução

As instruções específicas de instalação, configuração do MySQL, variáveis de ambiente e execução devem ser consultadas na documentação do projeto.

### Variáveis de ambiente

Exemplo:

```env
PORT=3000

DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=sistema_chamado_ia

AI_API_KEY=
```

**Não coloque chaves de API ou senhas reais no repositório.**

## Estrutura conceitual

```text
sistema-chamado-ia/
│
├── frontend/
│
├── backend/
│   ├── controllers/
│   ├── services/
│   │   ├── AIService
│   │   ├── PermissionService
│   │   ├── AutomationService
│   │   └── VerificationService
│   ├── routes/
│   ├── models/
│   └── ...
│
├── database/
│   ├── migrations/
│   └── seeds/
│
├── .env.example
├── README.md
└── ...
```

A estrutura real pode variar conforme a implementação atual do projeto.

## Projeto acadêmico

Este projeto foi desenvolvido como uma proposta acadêmica de inovação baseada na ideia de um sistema de suporte de TI utilizando Inteligência Artificial e automação.

O objetivo do MVP é demonstrar como o processo de atendimento pode evoluir de um modelo baseado exclusivamente na intervenção humana para um fluxo no qual a IA auxilia no diagnóstico e o sistema executa ações controladas e verificadas.

---

**Sistema de Chamado com IA**

**Diagnosticar. Automatizar. Testar. Resolver ou Encaminhar.**
