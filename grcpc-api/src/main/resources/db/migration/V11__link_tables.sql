CREATE TABLE control_objective_subprocess
(
    control_objective_id BIGINT NOT NULL,
    subprocess_id        BIGINT NOT NULL,
    PRIMARY KEY (control_objective_id, subprocess_id)
);

CREATE TABLE control_objective_risk
(
    control_objective_id BIGINT NOT NULL,
    risk_id              BIGINT NOT NULL,
    PRIMARY KEY (control_objective_id, risk_id)
);

CREATE TABLE policy_regulation
(
    policy_version_id BIGINT NOT NULL,
    regulation_id     BIGINT NOT NULL,
    PRIMARY KEY (policy_version_id, regulation_id)
);

CREATE TABLE policy_process
(
    policy_version_id BIGINT NOT NULL,
    process_id        BIGINT NOT NULL,
    PRIMARY KEY (policy_version_id, process_id)
);

CREATE TABLE policy_control
(
    policy_version_id BIGINT NOT NULL,
    control_id        BIGINT NOT NULL,
    PRIMARY KEY (policy_version_id, control_id)
);
