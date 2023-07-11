{% import 'catalog/ppas/macros/catalogs.sql' as CATALOGS %}
SELECT COUNT(*)
FROM
    pg_catalog.pg_namespace nsp
WHERE
    nsp.nspparent = 0 AND
    {% if scid %}
    nsp.oid={{scid}}::oid AND
    {% else %}
    {% if not show_sysobj %}
    nspname NOT LIKE 'pg!_%' escape '!' AND
    {% endif %}
    {% endif %}
    NOT (
{{ CATALOGS.LIST('nsp') }}
    )
    {% if schema_restrictions %}
        AND
        nsp.nspname in ({{schema_restrictions}})
    {% endif %}
