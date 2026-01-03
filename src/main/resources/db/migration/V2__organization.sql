CREATE TABLE organization
(
    id              BIGINT PRIMARY KEY DEFAULT nextval('seq_generic_id'),
    code            VARCHAR(50)  NOT NULL,
    name            VARCHAR(255) NOT NULL,

    parent_id       BIGINT,

    valid_from      DATE         NOT NULL,
    valid_to        DATE         NOT NULL,

    documents_count INT                DEFAULT 0,

    CONSTRAINT fk_org_parent
        FOREIGN KEY (parent_id)
            REFERENCES organization (id)
);