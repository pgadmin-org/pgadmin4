-- Publication: alterd_publication

-- DROP PUBLICATION alterd_publication;

CREATE PUBLICATION alterd_publication
    FOR ALL TABLES
    WITH (publish = 'insert, update, delete');
