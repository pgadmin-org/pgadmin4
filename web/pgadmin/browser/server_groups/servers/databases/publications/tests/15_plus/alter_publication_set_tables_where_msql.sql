ALTER PUBLICATION test_publication_create
    SET TABLE public.test_table_publication, TABLE public.test_table_publication_2 WHERE (dept_name='test');