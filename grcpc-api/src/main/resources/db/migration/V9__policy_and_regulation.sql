CREATE TABLE regulation
(
    id              BIGINT PRIMARY KEY DEFAULT nextval('seq_generic_id'),

    code            VARCHAR(50)  NOT NULL UNIQUE,
    name            VARCHAR(255) NOT NULL,
    description     TEXT,

    valid_from      DATE         NOT NULL,
    valid_to        DATE         NOT NULL,

    documents_count INT                DEFAULT 0
);

CREATE TABLE policy
(
    id              BIGINT PRIMARY KEY DEFAULT nextval('seq_generic_id'),

    code            VARCHAR(50)  NOT NULL,
    name            VARCHAR(255) NOT NULL,

    context         VARCHAR(10)  NOT NULL
        CHECK (context IN ('CENTRAL', 'LOCAL')),

    organization_id BIGINT,
    parent_id       BIGINT,

    description     TEXT,

    valid_from      DATE         NOT NULL,
    valid_to        DATE         NOT NULL,

    documents_count INT                DEFAULT 0,

    CONSTRAINT fk_policy_org
        FOREIGN KEY (organization_id)
            REFERENCES organization (id),

    CONSTRAINT fk_policy_parent
        FOREIGN KEY (parent_id)
            REFERENCES policy (id)
);
