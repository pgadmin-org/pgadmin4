CREATE PUBLICATION test_publication_create
    FOR TABLE ONLY public.test_table_publication
    WITH (publish = 'insert, update, delete, truncate', publish_via_partition_root = false);