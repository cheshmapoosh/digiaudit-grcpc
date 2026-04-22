create table system_setup (
    id uuid primary key,
    initialized boolean not null default false,
    initialized_at timestamp,
    initialized_by_user_id uuid,
    created_at timestamp not null,
    updated_at timestamp,
    created_by uuid,
    updated_by uuid,
    version bigint not null default 0
);
