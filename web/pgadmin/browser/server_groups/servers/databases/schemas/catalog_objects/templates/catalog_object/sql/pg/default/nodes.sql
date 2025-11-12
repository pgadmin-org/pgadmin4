SELECT
    c.oid, c.relname as name, description
FROM
    pg_catalog.pg_class c
    LEFT OUTER JOIN pg_catalog.pg_description d
        ON d.objoid=c.oid AND d.classoid='pg_class'::regclass
{% if scid %}
WHERE relnamespace = {{scid}}::oid
{% elif coid %}
WHERE c.oid = {{coid}}::oid
{% endif %}
ORDER BY relname;
