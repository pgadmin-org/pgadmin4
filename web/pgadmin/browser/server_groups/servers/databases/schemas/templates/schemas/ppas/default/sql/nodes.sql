{% import 'catalog/ppas/macros/catalogs.sql' as CATALOGS %}
SELECT
    nsp.oid,
    nsp.nspname as name,
    pg_catalog.has_schema_privilege(nsp.oid, 'CREATE') as can_create,
    pg_catalog.has_schema_privilege(nsp.oid, 'USAGE') as has_usage,
    des.description
FROM
    pg_catalog.pg_namespace nsp
    LEFT OUTER JOIN pg_catalog.pg_description des ON
        (des.objoid=nsp.oid AND des.classoid='pg_namespace'::regclass)
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
ORDER BY nspname;
