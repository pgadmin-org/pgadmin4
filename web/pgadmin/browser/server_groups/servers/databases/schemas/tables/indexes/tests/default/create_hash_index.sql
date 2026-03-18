-- Index: Idx_$%{}[]()&*^!@"'`\/#

-- DROP INDEX IF EXISTS public."Idx_$%{}[]()&*^!@""'`\/#";

CREATE INDEX IF NOT EXISTS "Idx_$%{}[]()&*^!@""'`\/#"
    ON public.test_table_for_indexes USING hash
    (id)
    TABLESPACE pg_default;
