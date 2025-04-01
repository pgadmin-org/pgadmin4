CREATE PUBLICATION test_publication_create
    FOR ALL TABLES
    WITH (publish = 'insert, update', publish_via_partition_root = false);
