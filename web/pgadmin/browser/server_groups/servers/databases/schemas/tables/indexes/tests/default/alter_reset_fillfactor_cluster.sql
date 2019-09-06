-- Index: Idx1_$%{}[]()&*^!@"'`\/#

-- DROP INDEX public."Idx1_$%{}[]()&*^!@""'`\/#";

CREATE UNIQUE INDEX "Idx1_$%{}[]()&*^!@""'`\/#"
    ON public.test_table_for_indexes USING btree
    (id DESC NULLS FIRST, name COLLATE pg_catalog."POSIX" text_pattern_ops DESC NULLS FIRST)
    TABLESPACE pg_default;

COMMENT ON INDEX public."Idx1_$%{}[]()&*^!@""'`\/#"
    IS 'Test Comment';
