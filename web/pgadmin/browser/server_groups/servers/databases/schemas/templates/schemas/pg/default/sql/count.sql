{% import 'catalog/pg/macros/catalogs.sql' as CATALOGS %}
SELECT COUNT(*)
FROM
    pg_catalog.pg_namespace nsp
WHERE
    {% if not showsysobj %}
     nspname NOT LIKE E'pg\\_%' AND
    {% endif %}
    NOT (
{{ CATALOGS.LIST('nsp') }}
    )
