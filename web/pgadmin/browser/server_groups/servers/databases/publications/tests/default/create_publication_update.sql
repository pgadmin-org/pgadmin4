-- Publication: test_publication_with_update

-- DROP PUBLICATION test_publication_with_update;

CREATE PUBLICATION test_publication_with_update
    FOR ALL TABLES
    WITH (publish = 'update', publish_via_partition_root = false);
