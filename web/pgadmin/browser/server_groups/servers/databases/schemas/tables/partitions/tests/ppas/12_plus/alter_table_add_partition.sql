-- Table: public.test_table_$%{}[]()&*^!@""'`\/#

-- DROP TABLE IF EXISTS public."test_table_$%{}[]()&*^!@""""'`\/#";

CREATE TABLE IF NOT EXISTS public."test_table_$%{}[]()&*^!@""""'`\/#"
(
    m_col bigint
) PARTITION BY RANGE (m_col);

ALTER TABLE IF EXISTS public."test_table_$%{}[]()&*^!@""""'`\/#"
    OWNER to enterprisedb;

COMMENT ON TABLE public."test_table_$%{}[]()&*^!@""""'`\/#"
    IS 'comment_01';

-- Partitions SQL

CREATE TABLE IF NOT EXISTS public."test_part_$%{}[]()&*^!@""""""""'`\/#" PARTITION OF public."test_table_$%{}[]()&*^!@""""'`\/#"
    FOR VALUES FROM ('0') TO ('1000')
TABLESPACE pg_default;

ALTER TABLE IF EXISTS public."test_part_$%{}[]()&*^!@""""""""'`\/#"
    OWNER to enterprisedb;
