{% if scid and doid %}
SELECT
    d.typname as name, bn.nspname as basensp
FROM
    pg_catalog.pg_type d
JOIN
    pg_catalog.pg_namespace bn ON bn.oid=d.typnamespace
WHERE
    d.typnamespace = {{scid}}::oid
AND
    d.oid={{doid}}::oid;
{% endif %}

{% if name %}
DROP DOMAIN {{ conn|qtIdent(basensp, name) }}{% if cascade %} CASCADE{% endif %};
{% endif %}
