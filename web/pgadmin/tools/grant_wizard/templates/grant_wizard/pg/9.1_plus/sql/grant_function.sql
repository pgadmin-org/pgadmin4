{# ===== Grant Permissions on Database Objects Selected ==== #}
{% import 'macros/functions/privilege.macros' as PRIVILEGE_FUNCTION %}
{% for obj in data.objects -%}
{% for priv in data.priv -%}
{# ===== if object_type is Function then apply function marcros ===== #}
{% if (obj.object_type == 'Function' or obj.object_type == 'Trigger Function') %}
{{ PRIVILEGE_FUNCTION.SET(conn, 'FUNCTION', priv['grantee'], obj.name, priv['without_grant'], priv['with_grant'], obj.nspname, obj.proargs)}}
{% endif -%}
{% endfor -%}
{% endfor -%}
