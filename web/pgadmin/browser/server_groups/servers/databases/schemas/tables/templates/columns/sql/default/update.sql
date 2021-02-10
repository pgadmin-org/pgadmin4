{% import 'columns/macros/security.macros' as SECLABEL %}
{% import 'columns/macros/privilege.macros' as PRIVILEGE %}
{% import 'macros/variable.macros' as VARIABLE %}
{% import 'types/macros/get_full_type_sql_format.macros' as GET_TYPE %}
{###  Rename column name ###}
{% if data.name and data.name != o_data.name %}
ALTER TABLE {{conn|qtIdent(data.schema, data.table)}}
    RENAME {{conn|qtIdent(o_data.name)}} TO {{conn|qtIdent(data.name)}};

{% endif %}
{###  Alter column type and collation ###}
{% if (data.cltype and data.cltype != o_data.cltype) or (data.attlen is defined and data.attlen != o_data.attlen) or (data.attprecision is defined and data.attprecision != o_data.attprecision) or (data.collspcname and data.collspcname != o_data.collspcname) or data.col_type_conversion is defined %}
{% if data.col_type_conversion is defined and data.col_type_conversion == False %}
-- WARNING:
-- The SQL statement below would normally be used to alter the datatype for the XXX column, however,
-- the current datatype cannot be cast to the target datatype so this conversion cannot be made automatically.

{% endif %}
{% if data.col_type_conversion is defined and data.col_type_conversion == False %} -- {% endif %}ALTER TABLE {{conn|qtIdent(data.schema, data.table)}}
{% if data.col_type_conversion is defined and data.col_type_conversion == False %} -- {% endif %}    ALTER COLUMN {% if data.name %}{{conn|qtTypeIdent(data.name)}}{% else %}{{conn|qtTypeIdent(o_data.name)}}{% endif %} TYPE {{ GET_TYPE.UPDATE_TYPE_SQL(conn, data, o_data) }}{% if data.collspcname and data.collspcname != o_data.collspcname %}
 COLLATE {{data.collspcname}}{% elif o_data.collspcname %} COLLATE {{o_data.collspcname}}{% endif %};
{% endif %}
{###  Alter column default value ###}
{% if data.defval is defined and data.defval is not none and data.defval != '' and data.defval != o_data.defval %}
ALTER TABLE {{conn|qtIdent(data.schema, data.table)}}
    ALTER COLUMN {% if data.name %}{{conn|qtTypeIdent(data.name)}}{% else %}{{conn|qtTypeIdent(o_data.name)}}{% endif %} SET DEFAULT {{data.defval}};

{% endif %}
{###  Drop column default value ###}
{% if data.defval is defined and data.defval == '' and data.defval != o_data.defval %}
ALTER TABLE {{conn|qtIdent(data.schema, data.table)}}
    ALTER COLUMN {% if data.name %}{{conn|qtTypeIdent(data.name)}}{% else %}{{conn|qtTypeIdent(o_data.name)}}{% endif %} DROP DEFAULT;

{% endif %}
{###  Alter column not null value ###}
{% if 'attnotnull' in data and data.attnotnull != o_data.attnotnull %}
ALTER TABLE {{conn|qtIdent(data.schema, data.table)}}
    ALTER COLUMN {% if data.name %}{{conn|qtTypeIdent(data.name)}}{% else %}{{conn|qtTypeIdent(o_data.name)}}{% endif %} {% if data.attnotnull %}SET{% else %}DROP{% endif %} NOT NULL;

{% endif %}
{###  Alter column statistics value ###}
{% if data.attstattarget is defined and data.attstattarget != o_data.attstattarget %}
ALTER TABLE {{conn|qtIdent(data.schema, data.table)}}
    ALTER COLUMN {% if data.name %}{{conn|qtTypeIdent(data.name)}}{% else %}{{conn|qtTypeIdent(o_data.name)}}{% endif %} SET STATISTICS {{data.attstattarget}};

{% endif %}
{###  Alter column storage value ###}
{% if data.attstorage is defined and data.attstorage != o_data.attstorage %}
ALTER TABLE {{conn|qtIdent(data.schema, data.table)}}
    ALTER COLUMN {% if data.name %}{{conn|qtTypeIdent(data.name)}}{% else %}{{conn|qtTypeIdent(o_data.name)}}{% endif %} SET STORAGE {%if data.attstorage == 'p' %}
PLAIN{% elif data.attstorage == 'm'%}MAIN{% elif data.attstorage == 'e'%}
EXTERNAL{% elif data.attstorage == 'x'%}EXTENDED{% endif %};

{% endif %}
{% if data.description is defined and data.description != None %}
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
{% set is_grantee_changed = (priv.grantee != priv.old_grantee) %}
{% if data.name %}
{% if is_grantee_changed %}
{{ PRIVILEGE.RESETALL(conn, data.schema, data.table, data.name, priv.old_grantee) }}
{% else %}
{{ PRIVILEGE.RESETALL(conn, data.schema, data.table, data.name, priv.grantee) }}
{% endif %}
{{ PRIVILEGE.APPLY(conn, data.schema, data.table, data.name, priv.grantee, priv.without_grant, priv.with_grant) }}
{% else %}
{% if is_grantee_changed %}
{{ PRIVILEGE.RESETALL(conn, data.schema, data.table, o_data.name, priv.old_grantee) }}
{% else %}
{{ PRIVILEGE.RESETALL(conn, data.schema, data.table, o_data.name, priv.grantee) }}
{% endif %}
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
