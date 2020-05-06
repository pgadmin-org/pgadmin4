SELECT --nspname, collname,
    CASE WHEN length(nspname::text) > 0 AND length(collname::text) > 0  THEN
    concat(nspname, '."', collname,'"')
    ELSE '' END AS copy_collation
FROM
    pg_collation c, pg_namespace n
WHERE
    c.collnamespace=n.oid
ORDER BY
    nspname, collname;
