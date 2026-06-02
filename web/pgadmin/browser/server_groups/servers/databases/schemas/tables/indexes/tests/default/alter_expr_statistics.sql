-- Index: Idx3_$%{}[]()&*^!@"'`\/#

-- DROP INDEX IF EXISTS public."Idx3_$%{}[]()&*^!@""'`\/#";

CREATE UNIQUE INDEX IF NOT EXISTS "Idx3_$%{}[]()&*^!@""'`\/#"
    ON public.test_table_for_indexes USING btree
    (id ASC NULLS LAST, lower(name) COLLATE pg_catalog."POSIX" text_pattern_ops ASC NULLS LAST)
    WITH (fillfactor=10)
    TABLESPACE pg_default
    WHERE id < 100;

COMMENT ON INDEX public."Idx3_$%{}[]()&*^!@""'`\/#"
    IS 'Test Comment';
