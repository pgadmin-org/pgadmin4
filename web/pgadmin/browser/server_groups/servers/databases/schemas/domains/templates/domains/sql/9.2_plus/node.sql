SELECT
    d.oid, d.typname as name, pg_catalog.pg_get_userbyid(d.typowner) as owner,
    bn.nspname as basensp
FROM
    pg_catalog.pg_type d
JOIN
    pg_catalog.pg_type b ON b.oid = d.typbasetype
JOIN
    pg_catalog.pg_namespace bn ON bn.oid=d.typnamespace
{% if scid is defined %}
WHERE
    d.typnamespace = {{scid}}::oid
{% elif doid %}
WHERE d.oid = {{doid}}::oid
{% endif %}
ORDER BY
    d.typname;
