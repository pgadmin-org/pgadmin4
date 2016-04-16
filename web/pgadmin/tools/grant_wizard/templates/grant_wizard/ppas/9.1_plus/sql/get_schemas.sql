{# ===== Fetch list of all schemas ===== #}
{% import 'catalog/ppas/macros/catalogs.sql' as CATALOGS %}
SELECT
    nsp.oid,
    nsp.nspname as name
FROM
    pg_namespace nsp
WHERE
    nsp.nspparent = 0 AND
    {% if nspid %}
    nsp.oid={{nspid}}::int AND
    {% else %}
    {% if not show_sysobj %}
    nspname NOT LIKE E'pg\_%' AND
    {% endif %}
    {% endif %}
    NOT (
{{ CATALOGS.LIST('nsp') }}
    )
ORDER BY nspname;
