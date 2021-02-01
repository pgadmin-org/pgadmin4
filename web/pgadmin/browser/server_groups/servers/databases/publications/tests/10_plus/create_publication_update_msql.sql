CREATE PUBLICATION test_publication_with_update
    FOR ALL TABLES
    WITH (publish = 'update');
