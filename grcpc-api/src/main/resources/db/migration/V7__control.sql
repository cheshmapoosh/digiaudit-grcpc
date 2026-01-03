CREATE TABLE control
(
    id                   BIGINT PRIMARY KEY DEFAULT nextval('seq_generic_id'),

    name                 VARCHAR(255) NOT NULL,
    description          TEXT,

    control_type         VARCHAR(50),

    context              VARCHAR(10)  NOT NULL
        CHECK (context IN ('CENTRAL', 'LOCAL')),

    subprocess_id        BIGINT       NOT NULL,
    control_objective_id BIGINT,

    organization_id      BIGINT,

    valid_from           DATE         NOT NULL,
    valid_to             DATE         NOT NULL,

    CONSTRAINT fk_control_subprocess
        FOREIGN KEY (subprocess_id)
            REFERENCES subprocess (id),

    CONSTRAINT fk_control_objective
        FOREIGN KEY (control_objective_id)
            REFERENCES control_objective (id),

    CONSTRAINT fk_control_org
        FOREIGN KEY (organization_id)
            REFERENCES organization (id)
);
