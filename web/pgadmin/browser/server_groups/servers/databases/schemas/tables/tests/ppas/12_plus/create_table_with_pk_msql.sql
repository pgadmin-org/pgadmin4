CREATE TABLE IF NOT EXISTS public."simple_table_with_pk$%{}[]()&*^!@""'`\/#"
(
    "col1_$%{}[]()&*^!@\""'`\\/#" integer,
    "col2_$%{}[]()&*^!@\""'`\\/#" json NOT NULL,
    PRIMARY KEY ("col1_$%{}[]()&*^!@\""'`\\/#")
);

ALTER TABLE public."simple_table_with_pk$%{}[]()&*^!@""'`\/#"
    OWNER to enterprisedb;

COMMENT ON TABLE public."simple_table_with_pk$%{}[]()&*^!@""'`\/#"
    IS 'test comment';
