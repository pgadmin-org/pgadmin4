SELECT * FROM
    (SELECT pg_catalog.format_type(t.oid,NULL) AS typname,
    CASE WHEN typelem > 0 THEN typelem ELSE t.oid END AS elemoid,
    typlen, typtype, t.oid, nspname,
    (SELECT COUNT(1) FROM pg_catalog.pg_type t2 WHERE t2.typname = t.typname) > 1 AS isdup,
    CASE WHEN t.typcollation != 0 THEN TRUE ELSE FALSE END AS is_collatable
FROM pg_catalog.pg_type t
   JOIN pg_catalog.pg_namespace nsp ON typnamespace=nsp.oid
WHERE (NOT (typname = 'unknown' AND nspname = 'pg_catalog')) AND typisdefined AND typtype IN ('b', 'c', 'd', 'e', 'r') AND NOT EXISTS (select 1 from pg_catalog.pg_class where relnamespace=typnamespace and relname = typname and relkind != 'c') AND (typname not like '_%' OR NOT EXISTS (select 1 from pg_catalog.pg_class where relnamespace=typnamespace and relname = substring(typname from 2)::name and relkind != 'c'))  AND nsp.nspname != 'information_schema'
    ) AS dummy
ORDER BY nspname <> 'pg_catalog', nspname <> 'public', nspname, 1
