{% for keypair in keys %}
{% if loop.index != 1 %}
UNION
{% endif %}
SELECT a1.attname as conattname,
    a2.attname as confattname
FROM pg_catalog.pg_attribute a1,
    pg_catalog.pg_attribute a2
WHERE a1.attrelid={{tid}}::oid
    AND a1.attnum={{keypair[1]}}
    AND a2.attrelid={{confrelid}}::oid
    AND a2.attnum={{keypair[0]}}
{% endfor %}
