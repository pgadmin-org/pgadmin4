{# ============= Below SQL will get the resource group name using oid ============= #}
{% if rgid %}
SELECT rgrpname FROM edb_resource_group WHERE oid = {{rgid}}::oid;
{% endif %}
{# ============= Below SQL will drop the resource group ============= #}
{% if rgname %}
DROP RESOURCE GROUP IF EXISTS {{ conn|qtIdent(rgname) }};
{% endif %}
