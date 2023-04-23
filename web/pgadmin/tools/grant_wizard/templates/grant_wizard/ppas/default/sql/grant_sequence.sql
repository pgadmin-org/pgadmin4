{# ===== Grant Permissions on Database Objects Selected ==== #}
{% import 'macros/schemas/privilege.macros' as PRIVILEGE %}
{% for obj in data.objects -%}
{% for priv in data.priv -%}
{% if obj.object_type == 'Sequence' %}
{{ PRIVILEGE.SET(conn, 'SEQUENCE', priv['grantee'], obj.name, priv['without_grant'], priv['with_grant'], obj.nspname ) }}
{% endif %}
{% endfor -%}
{% endfor -%}
