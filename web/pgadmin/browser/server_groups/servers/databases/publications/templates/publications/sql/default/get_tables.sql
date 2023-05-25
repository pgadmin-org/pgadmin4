SELECT pg_catalog.quote_ident(n.nspname) || '.' || pg_catalog.quote_ident(cls.relname) AS table_name
	FROM pg_publication_rel prel
	JOIN pg_class cls ON cls.oid = prel.prrelid
	JOIN pg_catalog.pg_namespace n ON cls.relnamespace = n.oid WHERE prel.prpubid = {{pbid}} :: oid;
