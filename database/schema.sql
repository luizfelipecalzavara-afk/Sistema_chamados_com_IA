-- ChamadoIA - schema.sql
-- MySQL 5.7+ / MySQL 8 recomendado
-- Cria o banco, tabelas e dados iniciais necessários para demonstração.

CREATE DATABASE IF NOT EXISTS chamados_ia CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE chamados_ia;

CREATE TABLE IF NOT EXISTS setores (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  ativo TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS categorias (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  descricao TEXT,
  ativo TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS prioridades (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(50) NOT NULL,
  sla_horas INT NOT NULL DEFAULT 4,
  ativo TINYINT(1) NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS usuarios (
  id VARCHAR(50) PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE,
  senha VARCHAR(255) NOT NULL,
  setor VARCHAR(100),
  tipo ENUM('usuario','tecnico','administrador') NOT NULL DEFAULT 'usuario',
  avatar VARCHAR(10),
  ativo TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tecnicos (
  id VARCHAR(50) PRIMARY KEY,
  user_id VARCHAR(50),
  nome VARCHAR(100) NOT NULL,
  especialidade VARCHAR(100),
  avatar VARCHAR(10),
  ativo TINYINT(1) NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS automacoes_catalogo (
  id VARCHAR(100) PRIMARY KEY,
  nome VARCHAR(150) NOT NULL,
  descricao TEXT,
  nivel ENUM('automatico','aprovacao','tecnico') NOT NULL DEFAULT 'automatico',
  categoria VARCHAR(100),
  ativo TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS chamados (
  id INT AUTO_INCREMENT PRIMARY KEY,
  numero VARCHAR(20) UNIQUE,
  usuario_id VARCHAR(50),
  tecnico_id VARCHAR(50),
  titulo VARCHAR(255) NOT NULL,
  descricao TEXT NOT NULL,
  categoria VARCHAR(100),
  prioridade VARCHAR(50),
  status VARCHAR(50) NOT NULL DEFAULT 'aberto',
  sla INT DEFAULT 4,
  diagnostico JSON,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  resolvido_em TIMESTAMP NULL DEFAULT NULL,
  reaberto_em TIMESTAMP NULL DEFAULT NULL,
  CONSTRAINT fk_chamado_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
  CONSTRAINT fk_chamado_tecnico FOREIGN KEY (tecnico_id) REFERENCES tecnicos(id)
);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  usuario_id VARCHAR(50) NOT NULL,
  token_hash CHAR(64) NOT NULL UNIQUE,
  expira_em DATETIME NOT NULL,
  usado_em DATETIME NULL,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_reset_usuario (usuario_id),
  INDEX idx_reset_expira (expira_em),
  CONSTRAINT fk_reset_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS historico_eventos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  chamado_id INT NOT NULL,
  tipo VARCHAR(100) NOT NULL,
  descricao TEXT NOT NULL,
  autor VARCHAR(100),
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_historico_chamado FOREIGN KEY (chamado_id) REFERENCES chamados(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS respostas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  chamado_id INT NOT NULL,
  autor_id VARCHAR(50),
  autor_nome VARCHAR(100),
  mensagem TEXT NOT NULL,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_resposta_chamado FOREIGN KEY (chamado_id) REFERENCES chamados(id) ON DELETE CASCADE
);

INSERT IGNORE INTO setores (id,nome) VALUES
(1,'TI'),(2,'Administrativo'),(3,'Financeiro'),(4,'RH'),(5,'Marketing'),(6,'Vendas'),(7,'Logística'),(8,'Operações');

INSERT IGNORE INTO categorias (id,nome,descricao) VALUES
(1,'impressora','Problemas com impressoras, filas de impressão e serviços relacionados'),
(2,'rede','Problemas de conectividade, internet e infraestrutura de rede'),
(3,'vpn','Problemas com VPN e acesso remoto'),(4,'acesso','Bloqueio de usuário, senhas e controle de acesso'),
(5,'software','Problemas com softwares e aplicações'),(6,'hardware','Problemas com equipamentos físicos'),
(7,'email','Problemas com e-mail e comunicação'),(8,'outro','Outros tipos de suporte');

INSERT IGNORE INTO prioridades (id,nome,sla_horas) VALUES (1,'baixa',8),(2,'media',4),(3,'alta',2),(4,'critica',1);

-- Hash bcrypt de dados fictícios. Para garantir as credenciais de teste, rode `npm run seed` após importar este schema.
INSERT IGNORE INTO usuarios (id,nome,email,senha,setor,tipo,avatar) VALUES
('u1','João Silva','joao@empresa.com','$2b$10$mvDT3hKqF6P19zfCc8RHGOkXvkBQJayTCjOXyMK2Le4AdD7yDu1mG','Financeiro','usuario','JS'),
('u3','Carlos Oliveira','carlos@empresa.com','$2b$10$mvDT3hKqF6P19zfCc8RHGOkXvkBQJayTCjOXyMK2Le4AdD7yDu1mG','TI','administrador','CO');

INSERT IGNORE INTO tecnicos (id,user_id,nome,especialidade,avatar) VALUES
('t1',NULL,'Rafael Mendes','Infraestrutura','RM'),('t2',NULL,'Juliana Alves','Redes e Impressão','JA'),('t3',NULL,'Bruno Ferreira','Suporte Geral','BF');

INSERT IGNORE INTO automacoes_catalogo (id,nome,descricao,nivel,categoria) VALUES
('verificar_impressora','Verificar Impressora','Verifica o status da impressora.','automatico','impressora'),
('verificar_fila_impressao','Verificar Fila de Impressão','Consulta a fila de impressão.','automatico','impressora'),
('limpar_fila_impressao','Limpar Fila de Impressão','Remove documentos travados da fila.','automatico','impressora'),
('verificar_servico_impressao','Verificar Serviço de Impressão','Verifica o Print Spooler.','automatico','impressora'),
('testar_impressao','Testar Impressão','Simula teste de impressão.','automatico','impressora'),
('reiniciar_fila_impressao','Reiniciar Serviço de Impressão','Reinicia serviço de impressão.','aprovacao','impressora'),
('verificar_conexao_rede','Verificar Conexão de Rede','Diagnóstico básico de conectividade.','automatico','rede'),
('redefinir_servico_critico','Redefinir Serviço Crítico','Reinicia serviços críticos.','tecnico','sistema');
