CREATE TABLE public."test_table_$%{}[]()&*^!@""""'`\/#"
(
    m_col bigint
) PARTITION BY RANGE (m_col)
WITH (
    OIDS = FALSE
);

ALTER TABLE IF EXISTS public."test_table_$%{}[]()&*^!@""""'`\/#"
    OWNER to postgres;

COMMENT ON TABLE public."test_table_$%{}[]()&*^!@""""'`\/#"
    IS 'comment_01';
