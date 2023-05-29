SELECT pg_catalog.quote_ident(n.nspname) || '.' || pg_catalog.quote_ident(cls.relname) AS table_name,
	(SELECT array_agg(attname) FROM pg_attribute att WHERE attrelid = prel.prrelid AND attnum IN (SELECT unnest(prattrs) FROM pg_publication_rel WHERE oid = prel.oid ) ) AS columns,
	pg_catalog.pg_get_expr(prel.prqual, prel.prrelid) AS where
	FROM pg_publication_rel prel
	JOIN pg_class cls ON cls.oid = prel.prrelid
	JOIN pg_catalog.pg_namespace n ON cls.relnamespace = n.oid WHERE prel.prpubid = {{pbid}} :: oid;
