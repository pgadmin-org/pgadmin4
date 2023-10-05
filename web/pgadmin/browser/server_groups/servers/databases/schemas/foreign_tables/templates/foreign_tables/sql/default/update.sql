{% import 'macros/schemas/security.macros' as SECLABEL %}
{% import 'macros/schemas/privilege.macros' as PRIVILEGE %}
{% if data %}
{% set name = o_data.name %}
{% if data.name %}{% if data.name != o_data.name %}
ALTER FOREIGN TABLE IF EXISTS {{ conn|qtIdent(o_data.basensp, o_data.name) }}
    RENAME TO {{ conn|qtIdent(data.name) }};

{% set name = data.name %}
{% endif %}{% endif %}
{% if data.owner %}
ALTER FOREIGN TABLE IF EXISTS {{ conn|qtIdent(o_data.basensp, name) }}
    OWNER TO {{ conn|qtIdent(data.owner) }};

{% endif %}
{% if data.inherits and data.inherits|length > 0%}
{% if o_data.inherits == None or o_data.inherits == 'None' %}
{% set inherits = '' %}
{% else %}
{% set inherits = o_data.inherits %}
{% endif %}
{% for i in data.inherits %}
{% if i not in inherits %}{% if i %}
ALTER FOREIGN TABLE IF EXISTS {{ conn|qtIdent(o_data.basensp, name) }} INHERIT {{i}};
{% endif %}
{% endif %}
{% endfor %}
{% endif %}
{% if o_data.inherits and 'inherits' in data %}
{% if data.inherits == None or data.inherits == 'None' %}
{% set inherits = '' %}
{% else %}
{% set inherits = data.inherits %}
{% endif %}
{% for i in o_data.inherits %}{% if i not in inherits %}{% if i %}
ALTER FOREIGN TABLE IF EXISTS {{ conn|qtIdent(o_data.basensp, name) }} NO INHERIT {{i}};{% endif %}
{% endif %}
{% endfor %}
{% endif %}
{% if data.constraints %}
{% for c in data.constraints.deleted %}
ALTER FOREIGN TABLE IF EXISTS {{ conn|qtIdent(o_data.basensp, name) }}
    DROP CONSTRAINT {{conn|qtIdent(c.conname)}};

{% endfor -%}
{% for c in data.constraints.added %}
ALTER FOREIGN TABLE IF EXISTS {{ conn|qtIdent(o_data.basensp, name) }}
    ADD CONSTRAINT {{ conn|qtIdent(c.conname) }} CHECK ({{ c.consrc }}){% if not c.convalidated %} NOT VALID{% endif %}{% if c.connoinherit %} NO INHERIT{% endif %};

{% endfor %}
{% if data.is_schema_diff is defined and data.is_schema_diff %}
{% for c in data.constraints.changed %}
ALTER FOREIGN TABLE IF EXISTS {{ conn|qtIdent(o_data.basensp, name) }}
    DROP CONSTRAINT {{conn|qtIdent(c.conname)}};

ALTER FOREIGN TABLE IF EXISTS {{ conn|qtIdent(o_data.basensp, name) }}
    ADD CONSTRAINT {{ conn|qtIdent(c.conname) }} CHECK ({{ c.consrc }}){% if not c.convalidated %} NOT VALID{% endif %}{% if c.connoinherit %} NO INHERIT{% endif %};

{% endfor %}
{% else %}
{% for c in data.constraints.changed %}
{% if c.convalidated %}
ALTER FOREIGN TABLE IF EXISTS {{ conn|qtIdent(o_data.basensp, name) }}
    VALIDATE CONSTRAINT {{ conn|qtIdent(c.conname) }};

{% endif %}
{% endfor %}
{% endif %}
{% endif %}
{% if data.ftoptions %}
{% for o in data.ftoptions.deleted %}
{% if o.option is defined and o.value is defined %}
ALTER FOREIGN TABLE IF EXISTS {{ conn|qtIdent(o_data.basensp, name) }}
    OPTIONS ( DROP {{o.option}});

{% endif %}
{% endfor %}
{% for o in data.ftoptions.added %}
{% if o.option is defined and o.value is defined %}
ALTER FOREIGN TABLE IF EXISTS {{ conn|qtIdent(o_data.basensp, name) }}
    OPTIONS (ADD {{o.option}} {{o.value|qtLiteral(conn)}});

{% endif %}
{% endfor %}
{% for o in data.ftoptions.changed %}
{% if o.option is defined and o.value is defined %}
ALTER FOREIGN TABLE IF EXISTS {{ conn|qtIdent(o_data.basensp, name) }}
    OPTIONS (SET {{o.option}} {{o.value|qtLiteral(conn)}});

{% endif %}
{% endfor %}
{% endif -%}
{% set seclabels = data.seclabels %}
{% if 'deleted' in seclabels and seclabels.deleted|length > 0 %}
{% for r in seclabels.deleted %}

{{ SECLABEL.UNSET(conn, 'FOREIGN TABLE', name, r.provider, o_data.basensp) }}
{% endfor %}
{% endif %}
{% if 'added' in seclabels and seclabels.added|length > 0 %}
{% for r in seclabels.added %}

{{ SECLABEL.SET(conn, 'FOREIGN TABLE', name, r.provider, r.label, o_data.basensp) }}
{% endfor %}
{% endif %}
{% if 'changed' in seclabels and seclabels.changed|length > 0 %}
{% for r in seclabels.changed %}

{{ SECLABEL.SET(conn, 'FOREIGN TABLE', name, r.provider, r.label, o_data.basensp) }}
{% endfor %}
{% endif -%}
{% if data.description is defined and data.description != o_data.description%}
COMMENT ON FOREIGN TABLE {{ conn|qtIdent(o_data.basensp, name) }}
    IS {{ data.description|qtLiteral(conn) }};

{% endif -%}
{% if data.relacl %}
{% if 'deleted' in data.relacl %}
{% for priv in data.relacl.deleted %}
{{ PRIVILEGE.UNSETALL(conn, 'TABLE', priv.grantee, name, o_data.basensp) }}

{% endfor %}
{% endif -%}
{% if 'changed' in data.relacl %}
{% for priv in data.relacl.changed %}
{{ PRIVILEGE.UNSETALL(conn, 'TABLE', priv.grantee, name, o_data.basensp) }}

{{ PRIVILEGE.SET(conn, 'TABLE', priv.grantee, name, priv.without_grant, priv.with_grant, o_data.basensp) }}

{% endfor %}
{% endif -%}
{% if 'added' in data.relacl %}
{% for priv in data.relacl.added %}
{{ PRIVILEGE.SET(conn, 'TABLE', priv.grantee, name, priv.without_grant, priv.with_grant, o_data.basensp) }}

{% endfor %}
{% endif %}
{% endif -%}
{% if data.basensp %}
ALTER FOREIGN TABLE IF EXISTS {{ conn|qtIdent(o_data.basensp, name) }}
    SET SCHEMA {{ conn|qtIdent(data.basensp) }};
{% endif %}
{% endif %}
