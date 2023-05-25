-- Publication: test_publication_create

-- DROP PUBLICATION IF EXISTS test_publication_create;

CREATE PUBLICATION test_publication_create
    FOR TABLE public.test_table_publication
    WITH (publish = 'insert, update, delete, truncate');