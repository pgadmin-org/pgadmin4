SELECT
    'DOMAIN' AS objectkind, c.oid as conoid, conname, typname as relname, nspname, description,
    regexp_replace(pg_get_constraintdef(c.oid, true), E'CHECK \\((.*)\\).*', E'\\1') as consrc, connoinherit, convalidated
FROM
    pg_constraint c
JOIN
    pg_type t ON t.oid=contypid
JOIN
    pg_namespace nl ON nl.oid=typnamespace
LEFT OUTER JOIN
    pg_description des ON (des.objoid=c.oid AND des.classoid='pg_constraint'::regclass)
WHERE
    contype = 'c' AND contypid =  {{doid}}::oid
ORDER BY
    conname;
