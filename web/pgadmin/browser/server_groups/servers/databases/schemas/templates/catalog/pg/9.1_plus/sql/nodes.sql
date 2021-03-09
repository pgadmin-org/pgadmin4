{% import 'catalog/pg/macros/catalogs.sql' as CATALOGS %}
SELECT
    nsp.oid,
{{ CATALOGS.LABELS('nsp', _) }},
    pg_catalog.has_schema_privilege(nsp.oid, 'CREATE') as can_create,
    pg_catalog.has_schema_privilege(nsp.oid, 'USAGE') as has_usage
FROM
    pg_catalog.pg_namespace nsp
WHERE
    {% if scid %}
    nsp.oid={{scid}}::oid AND
    {% endif %}
    (
{{ CATALOGS.LIST('nsp') }}
    )
ORDER BY 2;
