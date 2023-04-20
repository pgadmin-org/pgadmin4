CREATE INDEX
    ON public.test_table_for_indexes USING hash
    (id)
    TABLESPACE pg_default;
