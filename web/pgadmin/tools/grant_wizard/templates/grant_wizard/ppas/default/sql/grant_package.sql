{# ===== Grant Permissions on Database Objects Selected ==== #}
{% import 'macros/schemas/privilege.macros' as PRIVILEGE %}
{% for obj in data.objects -%}
{% for priv in data.priv -%}
{% if obj.object_type == 'Package' %}
{{ PRIVILEGE.SET(conn, 'PACKAGE', priv['grantee'], obj.name, priv['without_grant'], priv['with_grant'], obj.nspname ) }}
{% endif %}
{% endfor -%}
{% endfor -%}
