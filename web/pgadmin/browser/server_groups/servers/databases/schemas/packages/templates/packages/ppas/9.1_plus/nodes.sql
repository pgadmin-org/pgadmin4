SELECT
    nsp.oid, nspname AS name
FROM
    pg_catalog.pg_namespace nsp
WHERE nspparent = {{scid}}::oid
{% if pkgid %}
AND nsp.oid = {{pkgid}}::oid
{% endif %}
ORDER BY nspname;
