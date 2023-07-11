CREATE PUBLICATION test_publication_create
    FOR TABLE public.test_table_publication WHERE (emp_id=2 and name='test')
    WITH (publish = 'insert, update, delete, truncate', publish_via_partition_root = false);