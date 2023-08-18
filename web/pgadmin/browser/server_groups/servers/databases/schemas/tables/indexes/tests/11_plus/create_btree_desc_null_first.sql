-- Index: Idx_$%{}[]()&*^!@"'`\/#

-- DROP INDEX IF EXISTS public."Idx_$%{}[]()&*^!@""'`\/#";

CREATE UNIQUE INDEX IF NOT EXISTS "Idx_$%{}[]()&*^!@""'`\/#"
    ON public.test_table_for_indexes USING btree
    (id DESC NULLS FIRST, name COLLATE pg_catalog."POSIX" text_pattern_ops DESC NULLS FIRST)
    INCLUDE(name, id)
    TABLESPACE pg_default;
