-- Table: public.table_with_advanced_options_$%{}[]()&*^!@"'`\/#

-- DROP TABLE IF EXISTS public."table_with_advanced_options_$%{}[]()&*^!@""'`\/#";

CREATE UNLOGGED TABLE IF NOT EXISTS public."table_with_advanced_options_$%{}[]()&*^!@""'`\/#"
(
    col1 double precision,
    col2 numrange
)
WITH (
    OIDS = TRUE,
    FILLFACTOR = 50
)
TABLESPACE pg_default;

ALTER TABLE IF EXISTS public."table_with_advanced_options_$%{}[]()&*^!@""'`\/#"
    OWNER to enterprisedb;

REVOKE ALL ON TABLE public."table_with_advanced_options_$%{}[]()&*^!@""'`\/#" FROM PUBLIC;

GRANT SELECT ON TABLE public."table_with_advanced_options_$%{}[]()&*^!@""'`\/#" TO PUBLIC;

GRANT ALL ON TABLE public."table_with_advanced_options_$%{}[]()&*^!@""'`\/#" TO enterprisedb;

COMMENT ON TABLE public."table_with_advanced_options_$%{}[]()&*^!@""'`\/#"
    IS 'test comment';
