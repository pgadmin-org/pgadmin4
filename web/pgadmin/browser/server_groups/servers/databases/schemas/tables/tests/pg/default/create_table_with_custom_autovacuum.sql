-- Table: public.table_with_custom_autovaccum_$%{}[]()&*^!@"'`\/#

-- DROP TABLE IF EXISTS public."table_with_custom_autovaccum_$%{}[]()&*^!@""'`\/#";

CREATE TABLE IF NOT EXISTS public."table_with_custom_autovaccum_$%{}[]()&*^!@""'`\/#"
(
    col1 character varying(10)[] COLLATE pg_catalog."default",
    col2 date
)
WITH (
    OIDS = FALSE,
    autovacuum_enabled = TRUE,
    autovacuum_analyze_scale_factor = 0.2,
    autovacuum_analyze_threshold = 55,
    autovacuum_freeze_max_age = 20000000,
    autovacuum_vacuum_cost_delay = 25,
    autovacuum_vacuum_cost_limit = 10,
    autovacuum_vacuum_scale_factor = 0.3,
    autovacuum_vacuum_threshold = 60,
    autovacuum_freeze_min_age = 500000,
    autovacuum_freeze_table_age = 1300000
)
TABLESPACE pg_default;

ALTER TABLE IF EXISTS public."table_with_custom_autovaccum_$%{}[]()&*^!@""'`\/#"
    OWNER to postgres;

COMMENT ON TABLE public."table_with_custom_autovaccum_$%{}[]()&*^!@""'`\/#"
    IS 'custom auto vacuum';
