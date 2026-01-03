CREATE TABLE account_group
(
    id   BIGINT PRIMARY KEY DEFAULT nextval('seq_generic_id'),
    name VARCHAR(255) NOT NULL
);
