{% import 'catalog/ppas/macros/catalogs.sql' as CATALOGS %}
SELECT
    nsp.nspname as schema_name,
    {{ CATALOGS.LIST('nsp') }} AS is_catalog,
    {{ CATALOGS.DB_SUPPORT('nsp') }} AS db_support
FROM
    pg_catalog.pg_namespace nsp
WHERE
    nsp.oid = {{ scid|qtLiteral }}::OID;
