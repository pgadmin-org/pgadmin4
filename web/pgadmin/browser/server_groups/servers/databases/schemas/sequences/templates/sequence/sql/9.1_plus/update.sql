{% import 'macros/schemas/security.macros' as SECLABEL %}
{% import 'macros/schemas/privilege.macros' as PRIVILEGE %}
{% if data %}
{% if data.name != o_data.name %}
ALTER SEQUENCE {{ conn|qtIdent(o_data.schema, o_data.name) }}
    RENAME TO {{ conn|qtIdent(data.name) }};

{% endif %}
{% if data.seqowner and data.seqowner != o_data.seqowner %}
ALTER SEQUENCE {{ conn|qtIdent(o_data.schema, data.name) }}
    OWNER TO {{ conn|qtIdent(data.seqowner) }};

{% endif %}
{% if data.current_value %}
{% set seqname = conn|qtIdent(o_data.schema, data.name) %}
SELECT setval({{ seqname|qtLiteral }}, {{ data.current_value }}, true);

{% endif %}
{% set defquery = '' %}
{% if data.increment %}
{% set defquery = defquery+'\n    INCREMENT '+data.increment|string %}
{% endif %}
{% if data.minimum %}
{% set defquery = defquery+'\n    MINVALUE '+data.minimum|string %}
{% endif %}
{% if data.maximum %}
{% set defquery = defquery+'\n    MAXVALUE '+data.maximum|string %}
{% endif %}
{% if data.cache %}
{% set defquery = defquery+'\n    CACHE '+data.cache|string %}
{% endif %}
{% if data.cycled == True %}
{% set defquery = defquery+'\n    CYCLE' %}
{% elif data.cycled == False %}
{% set defquery = defquery+'\n    NO CYCLE' %}
{% endif %}
{% if defquery and defquery != '' %}
ALTER SEQUENCE {{ conn|qtIdent(o_data.schema, data.name) }} {{ defquery }};

{% endif %}
{% if data.schema and data.schema != o_data.schema %}
ALTER SEQUENCE {{ conn|qtIdent(o_data.schema, data.name) }}
    SET SCHEMA {{ conn|qtIdent(data.schema) }};

{% set seqname = conn|qtIdent(data.schema, data.name) %}
{% set schema = data.schema %}
{% else %}
{% set seqname = conn|qtIdent(o_data.schema, data.name) %}
{% set schema = o_data.schema %}
{% endif %}
{% if data.comment is defined and data.comment != o_data.comment %}
COMMENT ON SEQUENCE {{ seqname }}
    IS {{ data.comment|qtLiteral }};

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
{{ PRIVILEGE.UNSETALL(conn, 'SEQUENCE', priv.grantee, data.name, schema) }}
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
