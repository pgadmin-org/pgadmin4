SELECT --nspname, collname,
	CASE WHEN length(nspname) > 0 AND length(collname) > 0  THEN
	  concat(quote_ident(nspname), '.', quote_ident(collname))
	ELSE '' END AS collation
FROM pg_collation c, pg_namespace n
    WHERE c.collnamespace=n.oid
ORDER BY nspname, collname;