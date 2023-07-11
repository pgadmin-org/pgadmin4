SELECT COUNT(*)
FROM pg_catalog.pg_cast ca
WHERE 1=1
{# Check for Show system object #}
{% if (not showsysobj) and datlastsysoid %}
    AND ca.oid > {{datlastsysoid}}::OID
{% endif %}
