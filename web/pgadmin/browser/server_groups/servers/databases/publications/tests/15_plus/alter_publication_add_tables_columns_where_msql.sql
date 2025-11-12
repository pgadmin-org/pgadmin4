ALTER PUBLICATION test_publication_create
    ADD TABLE public.test_table_publication_2 (dept_id) WHERE (dept_id=2);