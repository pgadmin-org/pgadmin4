CREATE UNIQUE INDEX "Idx_$%{}[]()&*^!@""'`\/#"
    ON public.test_table_for_indexes USING btree
    (id ASC NULLS LAST, name COLLATE pg_catalog."POSIX" text_pattern_ops ASC NULLS LAST)
    INCLUDE(name, id)
    WITH (fillfactor=10)
    TABLESPACE pg_default
    WHERE id < 100;

COMMENT ON INDEX public."Idx_$%{}[]()&*^!@""'`\/#"
    IS 'Test Comment';
