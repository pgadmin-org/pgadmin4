{# ===== Grant Permissions to User Role on Views/Tables ===== #}
{% import 'macros/security.macros' as SECLABLE %}
{% import 'macros/schemas/privilege.macros' as PRIVILEGE %}
{# ===== We will generate Security Label SQL using macro ===== #}
{% if data.seclabels %}{% for r in data.seclabels %}{{ SECLABLE.APPLY(conn, 'VIEW', data.name, r.provider, r.label) }}{{'\r'}}{% endfor %}{{'\r'}}{% endif %}{% if data.datacl %}
{% for priv in data.datacl %}{{ PRIVILEGE.SET(conn, 'TABLE', priv.grantee, data.name, priv.without_grant, priv.with_grant, data.schema) }}{% endfor %}{% endif %}
