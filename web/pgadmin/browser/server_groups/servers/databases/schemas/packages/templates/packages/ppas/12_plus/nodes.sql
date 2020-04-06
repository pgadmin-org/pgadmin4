SELECT
    nsp.oid, nspname AS name
FROM
    pg_namespace nsp
WHERE nspparent = {{scid}}::oid
{% if pkgid %}
AND nsp.oid = {{pkgid}}::oid
{% endif %}
AND nspobjecttype = 0
AND nspcompoundtrigger = false
ORDER BY nspname;
