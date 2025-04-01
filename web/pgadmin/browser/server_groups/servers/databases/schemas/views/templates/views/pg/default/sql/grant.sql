{# ===== Grant Permissions to User Role on Views/Tables ===== #}
{% import 'macros/schemas/security.macros' as SECLABEL %}
{% import 'macros/schemas/privilege.macros' as PRIVILEGE %}
{% import 'columns/macros/privilege.macros' as COLUMN_PRIVILEGE %}
{# ===== We will generate Security Label SQL using macro ===== #}
{% if data.seclabels %}{% for r in data.seclabels %}{{ SECLABEL.SET(conn, 'VIEW', data.name, r.provider, r.label, data.schema) }}{{'\r'}}{% endfor %}{{'\r'}}{% endif %}{% if data.datacl %}
{% for priv in data.datacl %}{{ PRIVILEGE.SET(conn, 'TABLE', priv.grantee, data.name, priv.without_grant, priv.with_grant, data.schema) }}{% endfor %}{% endif %}{% if data.attacl %}
{% for priv in data.attacl %}{{ COLUMN_PRIVILEGE.APPLY(conn, data.schema, data.table, data.name, priv.grantee, priv.without_grant, priv.with_grant) }}{% endfor %}{% endif %}
