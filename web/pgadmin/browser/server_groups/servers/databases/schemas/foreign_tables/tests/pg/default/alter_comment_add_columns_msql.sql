COMMENT ON FOREIGN TABLE public."FT1_$%{}[]()&*^!@""'`\/#"
    IS 'Test Comment';

ALTER FOREIGN TABLE IF EXISTS public."FT1_$%{}[]()&*^!@""'`\/#"
    ADD COLUMN col1 bigint NOT NULL;

ALTER FOREIGN TABLE IF EXISTS public."FT1_$%{}[]()&*^!@""'`\/#"
    ADD COLUMN col2 text;
