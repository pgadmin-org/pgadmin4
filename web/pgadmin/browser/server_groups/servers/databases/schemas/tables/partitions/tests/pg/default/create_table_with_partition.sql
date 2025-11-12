-- Table: public.test_table_$%{}[]()&*^!@""'`\/#

-- DROP TABLE IF EXISTS public."test_table_$%{}[]()&*^!@""""'`\/#";

CREATE TABLE IF NOT EXISTS public."test_table_$%{}[]()&*^!@""""'`\/#"
(
    m_col bigint
) PARTITION BY RANGE (m_col)
WITH (
    OIDS = FALSE
)
TABLESPACE pg_default;

ALTER TABLE IF EXISTS public."test_table_$%{}[]()&*^!@""""'`\/#"
    OWNER to postgres;

COMMENT ON TABLE public."test_table_$%{}[]()&*^!@""""'`\/#"
    IS 'comment_01';
