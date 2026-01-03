CREATE TABLE policy_version
(
    id             BIGINT PRIMARY KEY   DEFAULT nextval('seq_generic_id'),

    policy_id      BIGINT      NOT NULL,
    version_number VARCHAR(20) NOT NULL,

    status         VARCHAR(20) NOT NULL
        CHECK (status IN ('DRAFT', 'ACTIVE', 'OBSOLETE')),

    effective_from DATE        NOT NULL,
    effective_to   DATE,

    created_at     TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_policy_version_policy
        FOREIGN KEY (policy_id)
            REFERENCES policy (id),

    CONSTRAINT uq_policy_version
        UNIQUE (policy_id, version_number)
);
