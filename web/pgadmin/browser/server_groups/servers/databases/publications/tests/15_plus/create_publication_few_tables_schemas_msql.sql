CREATE PUBLICATION test_publication_create
    FOR TABLE public.test_table_publication, TABLES IN SCHEMA test_schema_publication
    WITH (publish = 'insert, update, delete, truncate', publish_via_partition_root = false);