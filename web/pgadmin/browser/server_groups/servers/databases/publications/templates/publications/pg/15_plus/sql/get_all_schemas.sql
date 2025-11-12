{% import 'catalog/pg/macros/catalogs.sql' as CATALOGS %}
SELECT
    nsp.nspname
FROM
    pg_catalog.pg_namespace nsp
WHERE
     nspname NOT LIKE E'pg\\_%' AND
    NOT ({{ CATALOGS.LIST('nsp') }})
ORDER BY nspname;
