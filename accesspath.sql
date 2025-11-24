
CREATE DATABASE IF NOT EXISTS access_path
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE access_path;

CREATE TABLE usuarios (
    id_usuario   INT AUTO_INCREMENT PRIMARY KEY,
    nome         VARCHAR(100) NOT NULL,
    telefone     VARCHAR(20),
    email        VARCHAR(100) NOT NULL UNIQUE,
    senha_hash   VARCHAR(255) NOT NULL,         -- armazene hash (ex.: bcrypt/argon2), nunca senha em texto puro
    criado_em    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Índices úteis (além do UNIQUE no email)
CREATE INDEX ix_usuarios_nome ON usuarios (nome);

CREATE TABLE compras (
    id_compra      INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario     INT NOT NULL,
    quantidade     INT UNSIGNED NOT NULL,
    pagamento      ENUM('pix','cartao','boleto') NOT NULL,
    valor_estimado DECIMAL(10,2) NOT NULL,
    orcamento_json JSON NULL,                   -- opcional: receber o JSON do orçamento calculado no front
    data_compra    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_compras_usuarios
        FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE=InnoDB;

-- Índices úteis
CREATE INDEX ix_compras_usuario ON compras (id_usuario);
CREATE INDEX ix_compras_data ON compras (data_compra);

CREATE TABLE contatos (
    id_contato  INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario  INT NULL,
    nome        VARCHAR(100) NOT NULL,
    email       VARCHAR(100) NOT NULL,
    telefone    VARCHAR(20),
    assunto     ENUM('duvida','suporte','sugestao','outro') NOT NULL,
    mensagem    TEXT NOT NULL,
    enviado_em  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_contatos_usuarios
        FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario)
        ON DELETE SET NULL
        ON UPDATE CASCADE
) ENGINE=InnoDB;

-- Índices úteis
CREATE INDEX ix_contatos_usuario ON contatos (id_usuario);
CREATE INDEX ix_contatos_assunto ON contatos (assunto);
CREATE INDEX ix_contatos_email ON contatos (email);

CREATE VIEW vw_compras_usuario AS
SELECT
    c.id_compra,
    c.data_compra,
    u.id_usuario,
    u.nome        AS usuario,
    u.email       AS email,
    c.quantidade,
    c.pagamento,
    c.valor_estimado
FROM compras c
JOIN usuarios u ON u.id_usuario = c.id_usuario;

DROP VIEW IF EXISTS vw_contatos;
CREATE VIEW vw_contatos AS
SELECT
    ct.id_contato,
    ct.enviado_em,
    ct.nome,
    ct.email,
    ct.telefone,
    ct.assunto,
    ct.mensagem,
    u.id_usuario,
    u.nome AS usuario_vinculado
FROM contatos ct
LEFT JOIN usuarios u ON u.id_usuario = ct.id_usuario;

SELECT * FROM usuarios;
SELECT * FROM compras;
SELECT * FROM contatos;
select* from ambientes;

CREATE TABLE IF NOT EXISTS `ambientes` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `nome` VARCHAR(100) NOT NULL,
  `descricao` VARCHAR(255) NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

