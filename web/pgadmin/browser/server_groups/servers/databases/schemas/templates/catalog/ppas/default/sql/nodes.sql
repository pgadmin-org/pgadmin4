{% import 'catalog/ppas/macros/catalogs.sql' as CATALOGS %}
SELECT
    nsp.oid,
{{ CATALOGS.LABELS('nsp', _)  }},
    pg_catalog.has_schema_privilege(nsp.oid, 'CREATE') as can_create,
    pg_catalog.has_schema_privilege(nsp.oid, 'USAGE') as has_usage,
    des.description
FROM
    pg_catalog.pg_namespace nsp
    LEFT OUTER JOIN pg_catalog.pg_description des ON
        (des.objoid=nsp.oid AND des.classoid='pg_namespace'::regclass)
WHERE
    {% if scid %}
    nsp.oid={{scid}}::oid AND
    {% endif %}
    nsp.nspparent = 0 AND
    (
{{ CATALOGS.LIST('nsp') }}
    )
ORDER BY 2;
