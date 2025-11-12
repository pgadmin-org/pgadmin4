CREATE PUBLICATION test_publication_create
    FOR TABLE public.test_table_publication (emp_id, name) WHERE (emp_id=2 and name='test')
    WITH (publish = 'insert, update, delete, truncate', publish_via_partition_root = false);