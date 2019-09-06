CREATE INDEX "Idx_$%{}[]()&*^!@""'`\/#"
    ON public.test_table_for_indexes USING hash
    (id)
    TABLESPACE pg_default;
