-- Up
CREATE TABLE chats (
  id              INTEGER NOT NULL,
  token           TEXT,
  token_name      TEXT,
  token_precision INTEGER,
  amount          TEXT    NOT NULL DEFAULT "1",
  admin_only      BOOL    NOT NULL DEFAULT TRUE,
  PRIMARY KEY(id)
);

CREATE TABLE addresses (
    chat_id  INTEGER NOT NULL,
    user_id  INTEGER NOT NULL,
    address  TEXT    NOT NULL,
    modified INTEGER,
    PRIMARY KEY(chat_id, user_id)
);

-- Down
DROP TABLE addresses;
DROP TABLE chats;
