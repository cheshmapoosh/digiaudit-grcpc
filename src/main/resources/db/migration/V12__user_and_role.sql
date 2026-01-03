CREATE TABLE grc_user
(
    id        BIGINT PRIMARY KEY DEFAULT nextval('seq_generic_id'),
    username  VARCHAR(100) UNIQUE NOT NULL,
    full_name VARCHAR(255),
    active    BOOLEAN            DEFAULT TRUE
);

CREATE TABLE role
(
    id   BIGINT PRIMARY KEY DEFAULT nextval('seq_generic_id'),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255)       NOT NULL
);

CREATE TABLE user_role
(
    user_id BIGINT NOT NULL,
    role_id BIGINT NOT NULL,
    PRIMARY KEY (user_id, role_id)
);

CREATE TABLE role_organization
(
    role_id         BIGINT NOT NULL,
    organization_id BIGINT NOT NULL,
    PRIMARY KEY (role_id, organization_id)
);

CREATE TABLE role_control_objective
(
    role_id              BIGINT NOT NULL,
    control_objective_id BIGINT NOT NULL,
    responsibility       VARCHAR(20) CHECK (
        responsibility IN ('OWNER', 'PERFORMER', 'REVIEWER')
        ),
    PRIMARY KEY (role_id, control_objective_id)
);
