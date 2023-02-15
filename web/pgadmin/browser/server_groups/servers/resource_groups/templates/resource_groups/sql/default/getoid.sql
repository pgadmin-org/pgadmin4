{# ============= Get the resource group oid ============= #}
{% if rgname %}
SELECT oid FROM edb_resource_group WHERE rgrpname = {{ rgname|qtLiteral(conn) }};
{% endif %}
