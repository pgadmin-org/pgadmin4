SELECT --nspname, collname,
	CASE WHEN length(nspname::text) > 0 AND length(collname::text) > 0  THEN
	  pg_catalog.concat(pg_catalog.quote_ident(nspname), '.', pg_catalog.quote_ident(collname))
	ELSE '' END AS collation
FROM pg_catalog.pg_collation c, pg_catalog.pg_namespace n
    WHERE c.collnamespace=n.oid
ORDER BY nspname, collname;
