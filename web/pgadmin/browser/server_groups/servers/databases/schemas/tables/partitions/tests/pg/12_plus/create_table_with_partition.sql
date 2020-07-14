-- Table: public.test_table_$%{}[]()&*^!@""'`\/#

-- DROP TABLE public."test_table_$%{}[]()&*^!@""""'`\/#";

CREATE TABLE public."test_table_$%{}[]()&*^!@""""'`\/#"
(
    m_col bigint
) PARTITION BY RANGE (m_col);

ALTER TABLE public."test_table_$%{}[]()&*^!@""""'`\/#"
    OWNER to postgres;

COMMENT ON TABLE public."test_table_$%{}[]()&*^!@""""'`\/#"
    IS 'comment_01';
