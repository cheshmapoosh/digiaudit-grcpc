CREATE TABLE risk
(
    id          BIGINT PRIMARY KEY DEFAULT nextval('seq_generic_id'),

    name        VARCHAR(255) NOT NULL,
    description TEXT,

    valid_from  DATE         NOT NULL,
    valid_to    DATE         NOT NULL
);
