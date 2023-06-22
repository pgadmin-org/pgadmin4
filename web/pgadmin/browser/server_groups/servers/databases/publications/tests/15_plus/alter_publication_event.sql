-- Publication: alterd_publication

-- DROP PUBLICATION IF EXISTS alterd_publication;

CREATE PUBLICATION alterd_publication
    FOR ALL TABLES
    WITH (publish = 'insert, update, delete, truncate', publish_via_partition_root = false);
