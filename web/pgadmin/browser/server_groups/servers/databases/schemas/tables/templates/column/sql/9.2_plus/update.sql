{% import 'column/macros/security.macros' as SECLABLE %}
{% import 'column/macros/privilege.macros' as PRIVILEGE %}
{% import 'macros/variable.macros' as VARIABLE %}
{###  Rename column name ###}
{% if data.name != o_data.name %}
ALTER TABLE {{conn|qtIdent(data.schema, data.table)}}
    RENAME {{conn|qtIdent(o_data.name)}} TO {{conn|qtIdent(data.name)}};

{% endif %}
{###  Alter column type and collation ###}
{% if (data.cltype and data.cltype != o_data.cltype) or (data.attlen and data.attlen != o_data.attlen) or (data.attprecision and data.attprecision != o_data.attprecision) %}
ALTER TABLE {{conn|qtIdent(data.schema, data.table)}}
    ALTER COLUMN {{conn|qtIdent(data.name)}} TYPE {% if data.cltype %}{{data.cltype}} {% else %}{{o_data.cltype}} {% endif %}{% if data.attlen %}
({{data.attlen}}{% if data.attprecision%}, {{data.attprecision}}{% endif %}){% endif %}{% if data.hasSqrBracket %}
[]{% endif %}{% if data.collspcname and data.collspcname != o_data.collspcname %}
 COLLATE {{data.collspcname}}{% endif %};

{% endif %}
{###  Alter column default value ###}
{% if data.defval and data.defval != o_data.defval %}
ALTER TABLE {{conn|qtIdent(data.schema, data.table)}}
    ALTER COLUMN {{conn|qtIdent(data.name)}} SET DEFAULT {{data.defval}};

{% endif %}
{###  Alter column not null value ###}
{% if 'attnotnull' in data and data.attnotnull != o_data.attnotnull %}
ALTER TABLE {{conn|qtIdent(data.schema, data.table)}}
    ALTER COLUMN {{conn|qtIdent(data.name)}} {% if data.attnotnull %}SET{% else %}DROP{% endif %} NOT NULL;

{% endif %}
{###  Alter column statistics value ###}
{% if data.attstattarget and data.attstattarget != o_data.attstattarget %}
ALTER TABLE {{conn|qtIdent(data.schema, data.table)}}
    ALTER COLUMN {{conn|qtIdent(data.name)}} SET STATISTICS {{data.attstattarget}};

{% endif %}
{###  Alter column storage value ###}
{% if data.attstorage and data.attstorage != o_data.attstorage %}
ALTER TABLE {{conn|qtIdent(data.schema, data.table)}}
    ALTER COLUMN {{conn|qtIdent(data.name)}} SET STORAGE {%if data.attstorage == 'p' %}
PLAIN{% elif data.attstorage == 'm'%}MAIN{% elif data.attstorage == 'e'%}
EXTERNAL{% elif data.attstorage == 'x'%}EXTENDED{% endif %};

{% endif %}
{% if data.description is defined %}
COMMENT ON COLUMN {{conn|qtIdent(data.schema, data.table, data.name)}}
    IS {{data.description|qtLiteral}};

{% endif %}
{### Update column variables ###}
{% if 'attoptions' in data and data.attoptions|length > 0 %}
{% set variables = data.attoptions %}
{% if 'deleted' in variables and variables.deleted|length > 0 %}
ALTER TABLE {{conn|qtIdent(data.schema, data.table)}}
    {{ VARIABLE.UNSET(conn, 'COLUMN', data.name, variables.deleted) }}
{% endif %}
{% if 'added' in variables and variables.added|length > 0 %}
ALTER TABLE {{conn|qtIdent(data.schema, data.table)}}
    {{ VARIABLE.SET(conn, 'COLUMN', data.name, variables.added) }}
{% endif %}
{% if 'changed' in variables and variables.changed|length > 0 %}
ALTER TABLE {{conn|qtIdent(data.schema, data.table)}}
    {{ VARIABLE.SET(conn, 'COLUMN', data.name, variables.changed) }}
{% endif %}
{% endif %}
{### Update column privileges ###}
{# Change the privileges #}
{% if data.attacl %}
{% if 'deleted' in data.attacl %}
{% for priv in data.attacl.deleted %}
{{ PRIVILEGE.RESETALL(conn, data.schema, data.table, data.name, priv.grantee) }}
{% endfor %}
{% endif %}
{% if 'changed' in data.attacl %}
{% for priv in data.attacl.changed %}
{{ PRIVILEGE.RESETALL(conn, data.schema, data.table, data.name, priv.grantee) }}
{{ PRIVILEGE.APPLY(conn, data.schema, data.table, data.name, priv.grantee, priv.without_grant, priv.with_grant) }}
{% endfor %}
{% endif %}
{% if 'added' in data.attacl %}
{% for priv in data.attacl.added %}
{{ PRIVILEGE.APPLY(conn, data.schema, data.table, data.name, priv.grantee, priv.without_grant, priv.with_grant) }}
{% endfor %}
{% endif %}
{% endif %}
{### Uppdate tablespace securitylabel ###}
{# The SQL generated below will change Security Label #}
{% if data.seclabels and data.seclabels|length > 0 %}
{% set seclabels = data.seclabels %}
{% if 'deleted' in seclabels and seclabels.deleted|length > 0 %}
{% for r in seclabels.deleted %}
{{ SECLABLE.DROP(conn, 'COLUMN', data.schema, data.table, data.name, r.provider) }}
{% endfor %}
{% endif %}
{% if 'added' in seclabels and seclabels.added|length > 0 %}
{% for r in seclabels.added %}
{{ SECLABLE.APPLY(conn, 'COLUMN',data.schema, data.table, data.name, r.provider, r.label) }}
{% endfor %}
{% endif %}
{% if 'changed' in seclabels and seclabels.changed|length > 0 %}
{% for r in seclabels.changed %}
{{ SECLABLE.APPLY(conn, 'COLUMN',data.schema, data.table, data.name, r.provider, r.label) }}
{% endfor %}
{% endif %}
{% endif %}