SELECT c.oid, c.collname AS name
FROM pg_collation c
{% if scid %}
WHERE c.collnamespace = {{scid}}::oid
{% elif coid %}
WHERE c.oid = {{coid}}::oid
{% endif %}
ORDER BY c.collname;
