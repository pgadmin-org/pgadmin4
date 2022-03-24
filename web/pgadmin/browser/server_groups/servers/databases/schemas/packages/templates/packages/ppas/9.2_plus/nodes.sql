SELECT
    nsp.oid, nspname AS name
FROM
    pg_catalog.pg_namespace nsp
WHERE nspparent = {{scid}}::oid
{% if pkgid %}
AND nsp.oid = {{pkgid}}::oid
{% endif %}
{% if schema_diff %}
    AND CASE WHEN (SELECT COUNT(*) FROM pg_catalog.pg_depend
        WHERE objid = nsp.oid AND deptype = 'e') > 0 THEN FALSE ELSE TRUE END
{% endif %}
AND nspobjecttype = 0
ORDER BY nspname;
