{# FETCH CAST SOURCE TYPE AND TARGET TYPE Statement #}
{% if cid %}
SELECT
    pg_catalog.format_type(ca.castsource, null) as castsource,
    pg_catalog.format_type(ca.casttarget, null) as casttarget
FROM
    pg_catalog.pg_cast ca
WHERE
    ca.oid = {{cid}}::OID;
{% endif %}
{# DROP CAST Statement #}
{% if castsource and casttarget %}
DROP CAST ({{castsource}} AS {{casttarget}}) {% if cascade %}CASCADE{%endif%};
{% endif %}
