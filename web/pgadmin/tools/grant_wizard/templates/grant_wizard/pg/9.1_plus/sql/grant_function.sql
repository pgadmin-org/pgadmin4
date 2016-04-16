{# ===== Grant Permissions on Database Objects Selected ==== #}
{% import 'macros/functions/privilege.macros' as PRIVILEGE_FUNCTION %}
{% for obj in data.objects -%}
{% for priv in data.priv -%}
{% if (obj.object_type == 'Function' or obj.object_type == 'Trigger Function' or obj.object_type == 'Procedure') %}{% set func_type = 'PROCEDURE' if obj.object_type == 'Procedure' else 'FUNCTION' if obj.object_type == 'Function' or obj.object_type == 'Trigger Function' -%}
{{ PRIVILEGE_FUNCTION.SET(conn, func_type, priv['grantee'], obj.name, priv['without_grant'], priv['with_grant'], obj.nspname, obj.proargs)}}
{% endif -%}
{% endfor -%}
{% endfor -%}
