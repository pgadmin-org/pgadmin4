SELECT
    c.oid, c.relname as name
FROM
    pg_class c
{% if scid %}
WHERE relnamespace = {{scid}}::int
{% elif coid %}
WHERE c.oid = {{coid}}::int
{% endif %}
ORDER BY relname;
