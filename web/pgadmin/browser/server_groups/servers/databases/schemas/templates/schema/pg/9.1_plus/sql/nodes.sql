{% import 'catalog/pg/macros/catalogs.sql' as CATALOGS %}
SELECT
    nsp.oid,
    nsp.nspname as name,
    has_schema_privilege(nsp.oid, 'CREATE') as can_create,
    has_schema_privilege(nsp.oid, 'USAGE') as has_usage
FROM
    pg_namespace nsp
WHERE
    {% if scid %}
    nsp.oid={{scid}}::int AND
    {% else %}
    {% if show_sysobj %}
    nspname NOT LIKE E'pg\\_temp\\_%' AND
    nspname NOT LIKE E'pg\\_toast\\_temp\\_%' AND
    {% endif %}
    {% endif %}
    NOT (
{{ CATALOGS.LIST('nsp') }}
    )
ORDER BY nspname;
