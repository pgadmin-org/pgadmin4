{% import 'column/macros/security.macros' as SECLABEL %}
{% import 'column/macros/privilege.macros' as PRIVILEGE %}
{% import 'macros/variable.macros' as VARIABLE %}
{###  Rename column name ###}
{% if data.name and data.name != o_data.name %}
ALTER TABLE {{conn|qtIdent(data.schema, data.table)}}
    RENAME {{conn|qtIdent(o_data.name)}} TO {{conn|qtIdent(data.name)}};

{% endif %}
{###  Alter column type and collation ###}
{% if (data.cltype and data.cltype != o_data.cltype) or (data.attlen and data.attlen != o_data.attlen) or (data.attprecision or data.attprecision != o_data.attprecision) %}
ALTER TABLE {{conn|qtIdent(data.schema, data.table)}}
    ALTER COLUMN {% if data.name %}{{conn|qtTypeIdent(data.name)}}{% else %}{{conn|qtTypeIdent(o_data.name)}}{% endif %} TYPE {% if data.cltype %}{{conn|qtTypeIdent(data.cltype)}} {% else %}{{conn|qtTypeIdent(o_data.cltype)}} {% endif %}
{% if data.attlen and data.attlen != 'None' %}({{data.attlen}}{% if data.attlen != 'None' and data.attprecision %}, {{data.attprecision}}){% elif (data.cltype is defined and not data.cltype) %}, {{o_data.attprecision}}){% elif data.attlen %}){% endif %}{% endif %}{% if data.hasSqrBracket %}
[]{% endif %}{% if data.collspcname and data.collspcname != o_data.collspcname %}
 COLLATE {{data.collspcname}}{% endif %};
{% endif %}
{###  Alter column default value ###}
{% if data.defval and data.defval != o_data.defval %}
ALTER TABLE {{conn|qtIdent(data.schema, data.table)}}
    ALTER COLUMN {% if data.name %}{{conn|qtTypeIdent(data.name)}}{% else %}{{conn|qtTypeIdent(o_data.name)}}{% endif %} SET DEFAULT {{data.defval}};

{% endif %}
{###  Alter column not null value ###}
{% if 'attnotnull' in data and data.attnotnull != o_data.attnotnull %}
ALTER TABLE {{conn|qtIdent(data.schema, data.table)}}
    ALTER COLUMN {% if data.name %}{{conn|qtTypeIdent(data.name)}}{% else %}{{conn|qtTypeIdent(o_data.name)}}{% endif %} {% if data.attnotnull %}SET{% else %}DROP{% endif %} NOT NULL;

{% endif %}
{###  Alter column statistics value ###}
{% if data.attstattarget and data.attstattarget != o_data.attstattarget %}
ALTER TABLE {{conn|qtIdent(data.schema, data.table)}}
    ALTER COLUMN {% if data.name %}{{conn|qtTypeIdent(data.name)}}{% else %}{{conn|qtTypeIdent(o_data.name)}}{% endif %} SET STATISTICS {{data.attstattarget}};

{% endif %}
{###  Alter column storage value ###}
{% if data.attstorage and data.attstorage != o_data.attstorage %}
ALTER TABLE {{conn|qtIdent(data.schema, data.table)}}
    ALTER COLUMN {% if data.name %}{{conn|qtTypeIdent(data.name)}}{% else %}{{conn|qtTypeIdent(o_data.name)}}{% endif %} SET STORAGE {%if data.attstorage == 'p' %}
PLAIN{% elif data.attstorage == 'm'%}MAIN{% elif data.attstorage == 'e'%}
EXTERNAL{% elif data.attstorage == 'x'%}EXTENDED{% endif %};

{% endif %}
{% if data.description is defined %}
{% if data.name %}
COMMENT ON COLUMN {{conn|qtIdent(data.schema, data.table, data.name)}}
{% else %}
COMMENT ON COLUMN {{conn|qtIdent(data.schema, data.table, o_data.name)}}
{% endif %}
    IS {{data.description|qtLiteral}};

{% endif %}
{### Update column variables ###}
{% if 'attoptions' in data and data.attoptions|length > 0 %}
{% set variables = data.attoptions %}
{% if 'deleted' in variables and variables.deleted|length > 0 %}
ALTER TABLE {{conn|qtIdent(data.schema, data.table)}}
{% if data.name %}
    {{ VARIABLE.UNSET(conn, 'COLUMN', data.name, variables.deleted) }}
{% else %}
    {{ VARIABLE.UNSET(conn, 'COLUMN', o_data.name, variables.deleted) }}
{% endif %}
{% endif %}
{% if 'added' in variables and variables.added|length > 0 %}
ALTER TABLE {{conn|qtIdent(data.schema, data.table)}}
{% if data.name %}
    {{ VARIABLE.SET(conn, 'COLUMN', data.name, variables.added) }}
{% else %}
    {{ VARIABLE.SET(conn, 'COLUMN', o_data.name, variables.added) }}
{% endif %}
{% endif %}
{% if 'changed' in variables and variables.changed|length > 0 %}
ALTER TABLE {{conn|qtIdent(data.schema, data.table)}}
{% if data.name %}
    {{ VARIABLE.SET(conn, 'COLUMN', data.name, variables.changed) }}
{% else %}
    {{ VARIABLE.SET(conn, 'COLUMN', o_data.name, variables.changed) }}
{% endif %}
{% endif %}

{% endif %}
{### Update column privileges ###}
{# Change the privileges #}
{% if data.attacl %}
{% if 'deleted' in data.attacl %}
{% for priv in data.attacl.deleted %}
{% if data.name %}
{{ PRIVILEGE.RESETALL(conn, data.schema, data.table, data.name, priv.grantee) }}
{% else %}
{{ PRIVILEGE.RESETALL(conn, data.schema, data.table, o_data.name, priv.grantee) }}
{% endif %}
{% endfor %}
{% endif %}
{% if 'changed' in data.attacl %}
{% for priv in data.attacl.changed %}
{% if data.name %}
{{ PRIVILEGE.RESETALL(conn, data.schema, data.table, data.name, priv.grantee) }}
{{ PRIVILEGE.APPLY(conn, data.schema, data.table, data.name, priv.grantee, priv.without_grant, priv.with_grant) }}
{% else %}
{{ PRIVILEGE.RESETALL(conn, data.schema, data.table, o_data.name, priv.grantee) }}
{{ PRIVILEGE.APPLY(conn, data.schema, data.table, o_data.name, priv.grantee, priv.without_grant, priv.with_grant) }}
{% endif %}
{% endfor %}
{% endif %}
{% if 'added' in data.attacl %}
{% for priv in data.attacl.added %}
{% if data.name %}
{{ PRIVILEGE.APPLY(conn, data.schema, data.table, data.name, priv.grantee, priv.without_grant, priv.with_grant) }}
{% else %}
{{ PRIVILEGE.APPLY(conn, data.schema, data.table, o_data.name, priv.grantee, priv.without_grant, priv.with_grant) }}
{% endif %}
{% endfor %}
{% endif %}
{% endif %}
{### Uppdate tablespace securitylabel ###}
{# The SQL generated below will change Security Label #}
{% if data.seclabels and data.seclabels|length > 0 %}
{% set seclabels = data.seclabels %}
{% if 'deleted' in seclabels and seclabels.deleted|length > 0 %}
{% for r in seclabels.deleted %}
{% if data.name %}
{{ SECLABEL.DROP(conn, 'COLUMN', data.schema, data.table, data.name, r.provider) }}
{% else %}
{{ SECLABEL.DROP(conn, 'COLUMN', data.schema, data.table, o_data.name, r.provider) }}
{% endif %}
{% endfor %}
{% endif %}
{% if 'added' in seclabels and seclabels.added|length > 0 %}
{% for r in seclabels.added %}
{% if data.name %}
{{ SECLABEL.APPLY(conn, 'COLUMN',data.schema, data.table, data.name, r.provider, r.label) }}
{% else %}
{{ SECLABEL.APPLY(conn, 'COLUMN',data.schema, data.table, o_data.name, r.provider, r.label) }}
{% endif %}
{% endfor %}
{% endif %}
{% if 'changed' in seclabels and seclabels.changed|length > 0 %}
{% for r in seclabels.changed %}
{% if data.name %}
{{ SECLABEL.APPLY(conn, 'COLUMN',data.schema, data.table, data.name, r.provider, r.label) }}
{% else %}
{{ SECLABEL.APPLY(conn, 'COLUMN',data.schema, data.table, o_data.name, r.provider, r.label) }}
{% endif %}
{% endfor %}
{% endif %}

{% endif %}
