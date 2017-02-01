SELECT
    c.oid, c.relname as name
FROM
    pg_class c
{% if scid %}
WHERE relnamespace = {{scid}}::oid
{% elif coid %}
WHERE c.oid = {{coid}}::oid
{% endif %}
ORDER BY relname;
