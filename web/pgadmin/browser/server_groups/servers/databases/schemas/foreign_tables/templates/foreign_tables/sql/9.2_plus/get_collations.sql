SELECT --nspname, collname,
    CASE WHEN length(nspname::text) > 0 AND length(collname::text) > 0  THEN
    pg_catalog.concat(nspname, '."', collname,'"')
    ELSE '' END AS copy_collation
FROM
    pg_catalog.pg_collation c, pg_catalog.pg_namespace n
WHERE
    c.collnamespace=n.oid
ORDER BY nspname, collname;
