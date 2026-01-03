CREATE TABLE process
(
    id         BIGINT PRIMARY KEY DEFAULT nextval('seq_generic_id'),
    code       VARCHAR(50)  NOT NULL,
    name       VARCHAR(255) NOT NULL,

    valid_from DATE         NOT NULL,
    valid_to   DATE         NOT NULL
);
