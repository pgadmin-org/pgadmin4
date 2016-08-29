SELECT
    c.oid, conname AS name, typname AS relname, nspname, description,
    regexp_replace(pg_get_constraintdef(c.oid, true), E'CHECK \\((.*)\\).*', E'\\1') AS consrc,
    connoinherit, convalidated, convalidated AS convalidated_p
FROM
    pg_constraint c
JOIN
    pg_type t ON t.oid=contypid
JOIN
    pg_namespace nl ON nl.oid=typnamespace
LEFT OUTER JOIN
    pg_description des ON (des.objoid=c.oid AND des.classoid='pg_constraint'::regclass)
{% if doid %}
WHERE
    contype = 'c' AND contypid =  {{doid}}::oid
{% if coid %}
    AND c.oid = {{ coid }}
{% endif %}
{% elif coid %}
WHERE
c.oid = {{ coid }}
{% endif %}
