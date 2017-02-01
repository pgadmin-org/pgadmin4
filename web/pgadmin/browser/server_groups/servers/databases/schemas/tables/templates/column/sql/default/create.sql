{% import 'column/macros/security.macros' as SECLABEL %}
{% import 'column/macros/privilege.macros' as PRIVILEGE %}
{% import 'macros/variable.macros' as VARIABLE %}
{###  Add column ###}
{% if data.name and  data.cltype %}
ALTER TABLE {{conn|qtIdent(data.schema, data.table)}}
    ADD COLUMN {{conn|qtIdent(data.name)}} {{conn|qtTypeIdent(data.cltype)}}{% if data.attlen %}
({{data.attlen}}{% if data.attprecision%}, {{data.attprecision}}{% endif %}){% endif %}{% if data.hasSqrBracket %}
[]{% endif %}{% if data.collspcname %}
 COLLATE {{data.collspcname}}{% endif %}{% if data.attnotnull %}
 NOT NULL{% endif %}{% if data.defval %}
 DEFAULT {{data.defval}}{% endif %};

{% endif %}
{###  Add comments ###}
{% if data and data.description %}
COMMENT ON COLUMN {{conn|qtIdent(data.schema, data.table, data.name)}}
    IS {{data.description|qtLiteral}};

{% endif %}
{###  Add variables to column ###}
{% if data.attoptions %}
ALTER TABLE {{conn|qtIdent(data.schema, data.table)}}
    {{ VARIABLE.SET(conn, 'COLUMN', data.name, data.attoptions) }}

{% endif %}
{###  ACL ###}
{% if data.attacl %}
{% for priv in data.attacl %}
{{ PRIVILEGE.APPLY(conn, data.schema, data.table, data.name, priv.grantee, priv.without_grant, priv.with_grant) }}
{% endfor %}
{% endif %}
{###  Security Lables ###}
{% if data.seclabels %}
{% for r in data.seclabels %}
{{ SECLABEL.APPLY(conn, 'COLUMN',data.schema, data.table, data.name, r.provider, r.label) }}
{% endfor %}
{% endif %}
