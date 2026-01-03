CREATE TABLE subprocess
(
    id                       BIGINT PRIMARY KEY DEFAULT nextval('seq_generic_id'),
    name                     VARCHAR(255) NOT NULL,

    context                  VARCHAR(10)  NOT NULL
        CHECK (context IN ('CENTRAL', 'LOCAL')),

    process_id               BIGINT,
    organization_id          BIGINT,

    parent_id                BIGINT,
    local_identifying_number VARCHAR(50),
    allow_local_changes      BOOLEAN,

    valid_from               DATE         NOT NULL,
    valid_to                 DATE         NOT NULL,

    CONSTRAINT fk_subprocess_process
        FOREIGN KEY (process_id)
            REFERENCES process (id),

    CONSTRAINT fk_subprocess_org
        FOREIGN KEY (organization_id)
            REFERENCES organization (id),

    CONSTRAINT fk_subprocess_parent
        FOREIGN KEY (parent_id)
            REFERENCES subprocess (id)
);
