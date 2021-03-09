SELECT
    'DOMAIN' AS objectkind, c.oid as conoid, conname, typname as relname, nspname, description,
    pg_catalog.regexp_replace(pg_catalog.pg_get_constraintdef(c.oid, true), E'CHECK \\((.*)\\).*', E'\\1') as cons
FROM
    pg_catalog.pg_constraint c
JOIN
    pg_catalog.pg_type t ON t.oid=contypid
JOIN
    pg_catalog.pg_namespace nl ON nl.oid=typnamespace
LEFT OUTER JOIN
    pg_catalog.pg_description des ON (des.objoid=c.oid AND des.classoid='pg_constraint'::regclass)
WHERE
    contype = 'c'
    AND contypid =  {{doid}}::oid
ORDER BY conname;
