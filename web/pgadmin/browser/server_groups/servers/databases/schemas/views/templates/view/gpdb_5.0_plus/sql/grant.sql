{# ===== Grant Permissions to User Role on Views/Tables ===== #}
{% import 'macros/schemas/security.macros' as SECLABEL %}
{% import 'macros/schemas/privilege.macros' as PRIVILEGE %}
{# ===== We will generate Security Label SQL using macro ===== #}
{% if data.seclabels %}{% for r in data.seclabels %}{{ SECLABEL.SET(conn, 'VIEW', data.name, r.provider, r.label, data.schema) }}{{'\r'}}{% endfor %}{{'\r'}}{% endif %}{% if data.datacl %}
{% for priv in data.datacl %}{{ PRIVILEGE.SET(conn, 'TABLE', priv.grantee, data.name, priv.without_grant, priv.with_grant, data.schema) }}{% endfor %}{% endif %}
