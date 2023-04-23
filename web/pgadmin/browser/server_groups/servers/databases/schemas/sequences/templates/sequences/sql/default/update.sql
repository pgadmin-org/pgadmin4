{% import 'macros/schemas/security.macros' as SECLABEL %}
{% import 'macros/schemas/privilege.macros' as PRIVILEGE %}
{% if data %}
{% if data.name != o_data.name %}
ALTER SEQUENCE IF EXISTS {{ conn|qtIdent(o_data.schema, o_data.name) }}
    RENAME TO {{ conn|qtIdent(data.name) }};

{% endif %}
{% if data.seqowner and data.seqowner != o_data.seqowner %}
ALTER SEQUENCE IF EXISTS {{ conn|qtIdent(o_data.schema, data.name) }}
    OWNER TO {{ conn|qtIdent(data.seqowner) }};

{% endif %}
{% if (data.owned_table == None) and (data.owned_column == None) %}
ALTER SEQUENCE IF EXISTS {{ conn|qtIdent(o_data.schema, data.name) }}
    OWNED BY NONE;
{% elif (data.owned_table is defined or data.owned_column is defined) and (data.owned_table != o_data.owned_table or data.owned_column != o_data.owned_column) %}
ALTER SEQUENCE IF EXISTS {{ conn|qtIdent(o_data.schema, data.name) }}
    OWNED BY {% if data.owned_table is defined %}{{ conn|qtIdent(data.owned_table) }}{% else %}{{ conn|qtIdent(o_data.owned_table) }}{% endif %}.{% if data.owned_column is defined %}{{ conn|qtIdent(data.owned_column) }}{% else %}{{ conn|qtIdent(o_data.owned_column) }}{% endif %};
{% endif %}
{% if data.current_value is defined %}
{% set seqname = conn|qtIdent(o_data.schema, data.name) %}
SELECT setval({{ seqname|qtLiteral(conn) }}, {{ data.current_value }}, true);

{% endif %}
{% set defquery = '' %}
{% if data.increment is defined %}
{% set defquery = defquery+'\n    INCREMENT '+data.increment|string %}
{% endif %}
{% if data.start is defined %}
{% set defquery = defquery+'\n    START '+data.start|string %}
{% endif %}
{% if data.minimum is defined %}
{% set defquery = defquery+'\n    MINVALUE '+data.minimum|string %}
{% endif %}
{% if data.maximum is defined %}
{% set defquery = defquery+'\n    MAXVALUE '+data.maximum|string %}
{% endif %}
{% if data.cache is defined %}
{% set defquery = defquery+'\n    CACHE '+data.cache|string %}
{% endif %}
{% if data.cycled == True %}
{% set defquery = defquery+'\n    CYCLE' %}
{% elif data.cycled == False %}
{% set defquery = defquery+'\n    NO CYCLE' %}
{% endif %}
{% if defquery and defquery != '' %}
ALTER SEQUENCE IF EXISTS {{ conn|qtIdent(o_data.schema, data.name) }}{{ defquery }};

{% endif %}
{% if data.schema and data.schema != o_data.schema %}
ALTER SEQUENCE IF EXISTS {{ conn|qtIdent(o_data.schema, data.name) }}
    SET SCHEMA {{ conn|qtIdent(data.schema) }};

{% set seqname = conn|qtIdent(data.schema, data.name) %}
{% set schema = data.schema %}
{% else %}
{% set seqname = conn|qtIdent(o_data.schema, data.name) %}
{% set schema = o_data.schema %}
{% endif %}
{% if data.comment is defined and data.comment != o_data.comment %}
COMMENT ON SEQUENCE {{ seqname }}
    IS {{ data.comment|qtLiteral(conn) }};

{% endif %}
{% if data.securities and data.securities|length > 0 %}

{% set seclabels = data.securities %}
{% if 'deleted' in seclabels and seclabels.deleted|length > 0 %}
{% for r in seclabels.deleted %}
{{ SECLABEL.UNSET(conn, 'SEQUENCE', data.name, r.provider, schema) }}
{% endfor %}
{% endif %}
{% if 'added' in seclabels and seclabels.added|length > 0 %}
{% for r in seclabels.added %}
{{ SECLABEL.SET(conn, 'SEQUENCE', data.name, r.provider, r.label, schema) }}
{% endfor %}
{% endif %}
{% if 'changed' in seclabels and seclabels.changed|length > 0 %}
{% for r in seclabels.changed %}
{{ SECLABEL.SET(conn, 'SEQUENCE', data.name, r.provider, r.label, schema) }}
{% endfor %}
{% endif %}
{% endif %}
{% if data.relacl %}

{% if 'deleted' in data.relacl %}
{% for priv in data.relacl.deleted %}
{{ PRIVILEGE.UNSETALL(conn, 'SEQUENCE', priv.grantee, data.name, schema) }}
{% endfor %}
{% endif %}
{% if 'changed' in data.relacl %}
{% for priv in data.relacl.changed %}
{% if priv.grantee != priv.old_grantee %}
{{ PRIVILEGE.UNSETALL(conn, 'SEQUENCE', priv.old_grantee, data.name, schema) }}
{% else %}
{{ PRIVILEGE.UNSETALL(conn, 'SEQUENCE', priv.grantee, data.name, schema) }}
{% endif %}
{{ PRIVILEGE.SET(conn, 'SEQUENCE', priv.grantee, data.name, priv.without_grant, priv.with_grant, schema) }}
{% endfor %}
{% endif %}
{% if 'added' in data.relacl %}
{% for priv in data.relacl.added %}
{{ PRIVILEGE.SET(conn, 'SEQUENCE', priv.grantee, data.name, priv.without_grant, priv.with_grant, schema) }}
{% endfor %}
{% endif %}
{% endif %}
{% endif %}
