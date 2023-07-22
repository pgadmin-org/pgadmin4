{% import 'catalog/ppas/macros/catalogs.sql' as CATALOGS %}
SELECT
    nsp.nspname
FROM
    pg_catalog.pg_namespace nsp
WHERE
    nsp.nspparent = 0 AND
    nspname NOT LIKE 'pg!_%' escape '!' AND
    NOT ({{ CATALOGS.LIST('nsp') }})
ORDER BY nspname;
