{% import 'macros/schemas/security.macros' as SECLABEL %}
{% if data %}
{% set name = o_data.name %}
{% if data.name %}
{% if data.name != o_data.name %}
ALTER DOMAIN {{ conn|qtIdent(o_data.basensp, o_data.name) }}
    RENAME TO {{ conn|qtIdent(data.name) }};
{% set name = data.name %}
{% endif %}
{% endif -%}
{% if data.typnotnull and not o_data.typnotnull %}

ALTER DOMAIN {{ conn|qtIdent(o_data.basensp, name) }}
    SET NOT NULL;
{% elif 'typnotnull' in data and not data.typnotnull and o_data.typnotnull%}

ALTER DOMAIN {{ conn|qtIdent(o_data.basensp, name) }}
    DROP NOT NULL;
{% endif -%}{% if data.typdefault %}

ALTER DOMAIN {{ conn|qtIdent(o_data.basensp, name) }}
    SET DEFAULT {{ data.typdefault }};
{% elif (data.typdefault == '' or data.typdefault == None) and data.typdefault != o_data.typdefault %}

ALTER DOMAIN {{ conn|qtIdent(o_data.basensp, name) }}
    DROP DEFAULT;
{% endif -%}{% if data.owner %}

ALTER DOMAIN {{ conn|qtIdent(o_data.basensp, name) }}
    OWNER TO {{ conn|qtIdent(data.owner) }};
{% endif -%}{% if data.constraints %}
{% for c in data.constraints.deleted %}

ALTER DOMAIN {{ conn|qtIdent(o_data.basensp, name) }}
    DROP CONSTRAINT {{ conn|qtIdent(o_data['constraints'][c.conoid]['conname']) }};
{% endfor -%}
{% if data.is_schema_diff is defined and data.is_schema_diff %}
{% for c in data.constraints.changed %}
ALTER DOMAIN {{ conn|qtIdent(o_data.basensp, name) }}
    DROP CONSTRAINT {{ conn|qtIdent(c.conname) }};

ALTER DOMAIN {{ conn|qtIdent(o_data.basensp, name) }}
    ADD CONSTRAINT {{ conn|qtIdent(c.conname) }} CHECK ({{ c.consrc }}){% if not c.convalidated %} NOT VALID{% endif %}{% if c.connoinherit %} NO INHERIT{% endif -%};

{% if c.description is defined and c.description != '' %}
COMMENT ON CONSTRAINT {{ conn|qtIdent(c.conname) }} ON DOMAIN {{ conn|qtIdent(o_data.basensp, name) }}
    IS {{ c.description|qtLiteral }};{% endif %}
{% endfor -%}
{% else %}
{% for c in data.constraints.changed %}
{% if c.conname and c.conname !=o_data['constraints'][c.conoid]['conname'] %}

ALTER DOMAIN {{ conn|qtIdent(o_data.basensp, name) }}
     RENAME CONSTRAINT {{ conn|qtIdent(o_data['constraints'][c.conoid]['conname']) }} TO {{ conn|qtIdent(c.conname) }};
{% endif %}
{% if c.convalidated and not o_data['constraints'][c.conoid]['convalidated'] %}

ALTER DOMAIN {{ conn|qtIdent(o_data.basensp, name) }}
     VALIDATE CONSTRAINT {{ conn|qtIdent(c.conname) }};
{% endif %}
{% endfor -%}
{% endif %}
{% for c in data.constraints.added %}
{% if c.conname and c.consrc %}

ALTER DOMAIN {{ conn|qtIdent(o_data.basensp, name) }}
    ADD CONSTRAINT {{ conn|qtIdent(c.conname) }} CHECK ({{ c.consrc }}){% if not c.convalidated %} NOT VALID{% endif %}{% if c.connoinherit %} NO INHERIT{% endif -%};{% endif -%}
{% endfor -%}{% endif -%}
{% set seclabels = data.seclabels %}
{% if 'deleted' in seclabels and seclabels.deleted|length > 0 %}
{% for r in seclabels.deleted %}
{{ SECLABEL.UNSET(conn, 'DOMAIN', name, r.provider, o_data.basensp) }}

{% endfor %}
{% endif -%}
{% if 'added' in seclabels and seclabels.added|length > 0 %}
{% for r in seclabels.added %}

{{ SECLABEL.SET(conn, 'DOMAIN', name, r.provider, r.label, o_data.basensp) }}
{% endfor %}
{% endif -%}{% if 'changed' in seclabels and seclabels.changed|length > 0 %}
{% for r in seclabels.changed %}

{{ SECLABEL.SET(conn, 'DOMAIN', name, r.provider, r.label, o_data.basensp) }}
{% endfor %}
{% endif -%}{% if data.description is defined and data.description != o_data.description %}

COMMENT ON DOMAIN {{ conn|qtIdent(o_data.basensp, name) }}
    IS {{ data.description|qtLiteral }};
{% endif -%}{% if data.basensp %}

ALTER DOMAIN {{ conn|qtIdent(o_data.basensp, name) }}
    SET SCHEMA {{ conn|qtIdent(data.basensp) }};{% endif -%}
{% endif -%}
