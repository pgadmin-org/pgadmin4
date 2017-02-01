{# FETCH CAST SOURCE TYPE AND TARGET TYPE Statement #}
{% if cid %}
SELECT
    format_type(ca.castsource, null) as castsource,
    format_type(ca.casttarget, null) as casttarget
FROM
    pg_cast ca
WHERE
    ca.oid = {{cid}}::OID;
{% endif %}
{# DROP CAST Statement #}
{% if castsource and casttarget %}
DROP CAST ({{castsource}} AS {{casttarget}}) {% if cascade %}CASCADE{%endif%};
{% endif %}