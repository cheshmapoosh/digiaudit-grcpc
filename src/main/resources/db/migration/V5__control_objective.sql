CREATE TABLE control_objective
(
    id                 BIGINT PRIMARY KEY DEFAULT nextval('seq_control_objective_id'),

    name               VARCHAR(255) NOT NULL,
    description        TEXT,

    objective_category VARCHAR(100) NOT NULL,
    timeframe_year     INT          NOT NULL,

    valid_from         DATE         NOT NULL,
    valid_to           DATE         NOT NULL,

    documents_count    INT                DEFAULT 0
);
