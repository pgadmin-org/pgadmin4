CREATE PUBLICATION test_publication_create
    FOR ALL TABLES
    WITH (publish = 'insert, update');
