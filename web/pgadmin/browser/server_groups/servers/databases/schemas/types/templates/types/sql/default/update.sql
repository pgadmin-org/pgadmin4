{% import 'macros/schemas/security.macros' as SECLABEL %}
{% import 'macros/schemas/privilege.macros' as PRIVILEGE %}
{% import 'types/macros/get_full_type_sql_format.macros' as GET_TYPE %}
{#======================================#}
{# Below will change object owner #}
{% if data.typeowner and data.typeowner != o_data.typeowner %}
ALTER TYPE {{ conn|qtIdent(o_data.schema, o_data.name) }}
    OWNER TO {{ conn|qtIdent(data.typeowner) }};

{% endif %}
{#======================================#}
{# Below will change objects comment  #}
{% if data.description is defined and data.description != o_data.description %}
COMMENT ON TYPE {{ conn|qtIdent(o_data.schema, o_data.name) }}
    IS {{ data.description|qtLiteral }};

{% endif %}
{#======================================#}
{### The sql given below will update composite type ###}
{% if data.composite and data.composite|length > 0 %}
{% set composite = data.composite %}
{% if 'deleted' in composite and composite.deleted|length > 0 %}
{% for r in composite.deleted %}
ALTER TYPE {{ conn|qtIdent(o_data.schema, o_data.name) }}
    DROP ATTRIBUTE {{conn|qtIdent(r.member_name)}};
{% endfor %}
{% endif %}
{% if 'added' in composite and composite.added|length > 0 %}
{% for r in composite.added %}
ALTER TYPE {{ conn|qtIdent(o_data.schema, o_data.name) }}
    ADD ATTRIBUTE {{conn|qtIdent(r.member_name)}} {{ GET_TYPE.CREATE_TYPE_SQL(conn, r.cltype, r.tlength, r.precision, r.hasSqrBracket) }}{% if r.collation %}
 COLLATE {{r.collation}}{% endif %};
{% endfor %}
{% endif %}
{% if 'changed' in composite and composite.changed|length > 0 %}
{% for r in composite.changed %}
{% for o in o_data.composite %}
{##### Variables for the loop #####}
{% set member_name = o.member_name %}
{% set cltype = o.cltype %}
{% set tlength = o.tlength %}
{% set precision = o.precision %}
{% set hasSqrBracket = o.hasSqrBracket %}
{##### If member name changed #####}
{% if o.attnum == r.attnum %}
{% if r.member_name and o.member_name != r.member_name %}
ALTER TYPE {{ conn|qtIdent(o_data.schema, o_data.name) }}
    RENAME ATTRIBUTE {{o.member_name}} TO {{r.member_name}};
{% set member_name = r.member_name %}
{% endif %}
{##### If type changed #####}
{% if r.cltype and cltype != r.cltype %}
{% set cltype = r.cltype %}
{% set hasSqrBracket = r.hasSqrBracket %}
{##### If length is not allowed on type #####}
{% if not r.is_tlength %}
{% set tlength = 0 %}
{% set precision = 0 %}
{% endif %}
{% endif %}
{##### If length changed #####}
{% if r.tlength and tlength != r.tlength %}
{% set tlength = r.tlength %}
{% endif %}
{##### If precision changed #####}
{% if tlength and r.precision and precision != r.precision %}
{% set precision = r.precision %}
{% endif %}
ALTER TYPE {{ conn|qtIdent(o_data.schema, o_data.name) }}
        ALTER ATTRIBUTE {{conn|qtIdent(member_name)}} SET DATA TYPE {{ GET_TYPE.CREATE_TYPE_SQL(conn, cltype, tlength, precision, hasSqrBracket) }}{% if r.collation %}
 COLLATE {{r.collation}}{% endif %};
{% endif%}
{% endfor %}
{% endfor %}
{% endif %}
{% endif %}
{#======================================#}
{### The sql given below will update enum type ###}
{% if data.enum and data.enum|length > 0 %}
{% set enum = data.enum %}
{% set o_enum_len = o_data.enum|length %}
{# We need actual list index from length #}
{% set o_enum_len = o_enum_len - 1 %}
{% if 'added' in enum and enum.added|length > 0 %}
{% for r in enum.added %}
{% set c_idx = loop.index %}
{% if c_idx == 1 %}
{# if first new element then add it after old data enum list#}
ALTER TYPE {{ conn|qtIdent(o_data.schema, o_data.name) }}
    ADD VALUE {{r.label|qtLiteral}} {% if o_enum_len > 0 %}AFTER {{o_data.enum[o_enum_len].label|qtLiteral }}{% endif %};
{% else %}
{# if first new element then add it after new data enum list#}
{% set p_idx = loop.index - 2 %}
ALTER TYPE {{ conn|qtIdent(o_data.schema, o_data.name) }}
    ADD VALUE {{r.label|qtLiteral}} AFTER {{enum.added[p_idx].label|qtLiteral}};
{% endif %}
{% endfor %}
{% endif %}

{% endif %}
{#======================================#}
{# The SQL generated below will change Security Label #}
{% if data.seclabels and data.seclabels|length > 0 %}
{% set seclabels = data.seclabels %}
{% if 'deleted' in seclabels and seclabels.deleted|length > 0 %}
{% for r in seclabels.deleted %}
{{ SECLABEL.UNSET(conn, 'TYPE', o_data.name, r.provider, o_data.schema) }}
{% endfor %}
{% endif %}
{% if 'added' in seclabels and seclabels.added|length > 0 %}
{% for r in seclabels.added %}
{{ SECLABEL.SET(conn, 'TYPE', o_data.name, r.provider, r.label, o_data.schema) }}
{% endfor %}
{% endif %}
{% if 'changed' in seclabels and seclabels.changed|length > 0 %}
{% for r in seclabels.changed %}
{{ SECLABEL.SET(conn, 'TYPE', o_data.name, r.provider, r.label, o_data.schema) }}
{% endfor %}
{% endif %}

{% endif %}
{#======================================#}
{# Change the privileges #}
{% if data.typacl and data.typacl|length > 0 %}
{% if 'deleted' in data.typacl %}
{% for priv in data.typacl.deleted %}
{{ PRIVILEGE.UNSETALL(conn, 'TYPE', priv.grantee, o_data.name, o_data.schema) }}
{% endfor %}
{% endif %}
{% if 'changed' in data.typacl %}
{% for priv in data.typacl.changed %}
{{ PRIVILEGE.UNSETALL(conn, 'TYPE', priv.grantee, o_data.name, o_data.schema) }}
{{ PRIVILEGE.SET(conn, 'TYPE', priv.grantee, o_data.name, priv.without_grant, priv.with_grant, o_data.schema) }}
{% endfor %}
{% endif %}
{% if 'added' in data.typacl %}
{% for priv in data.typacl.added %}
{{ PRIVILEGE.SET(conn, 'TYPE', priv.grantee, o_data.name, priv.without_grant, priv.with_grant, o_data.schema) }}
{% endfor %}
{% endif %}
{% endif %}
{#======================================#}
{# Below will change object name #}
{% if data.name and data.name != o_data.name %}
ALTER TYPE {{ conn|qtIdent(o_data.schema, o_data.name) }}
    RENAME TO {{ conn|qtIdent(data.name) }};

{% endif %}
{#======================================#}
{# Below will change the schema for object #}
{# with extra if condition we will also make sure that object has correct name #}
{% if data.schema and data.schema != o_data.schema %}
ALTER TYPE {% if data.name and data.name != o_data.name %}{{ conn|qtIdent(o_data.schema, data.name) }}
{% else %}{{ conn|qtIdent(o_data.schema, o_data.name) }}
{% endif %}
    SET SCHEMA {{ conn|qtIdent(data.schema) }};
{% endif %}
