{% import 'macros/schemas/security.macros' as SECLABEL %}
{% import 'macros/schemas/privilege.macros' as PRIVILEGE %}
{% set is_columns = [] %}
{% if data.columns %}{% set columns = data.columns %}{% elif o_data.columns %}{% set columns = o_data.columns %}{% endif %}
{% if data.inherits %}{% set inherits = data.inherits %}{% elif o_data.columns %}{% set inherits = o_data.inherits %}{% endif %}
{% if data.ftoptions %}{% set ftoptions = data.ftoptions %}{% elif o_data.ftoptions %}{% set ftoptions = o_data.ftoptions %}{% endif %}
{% if data.constraints %}{% set constraints = data.constraints %}{% elif o_data.constraints %}{% set constraints = o_data.constraints %}{% endif %}
{% if data.acl %}{% set acl = data.acl %}{% elif o_data.acl %}{% set acl = o_data.acl %}{% endif %}
-- WARNING:
-- We have found the difference in foreign server
-- so we need to drop the existing foreign table first and re-create it.
DROP FOREIGN TABLE {{ conn|qtIdent(o_data.basensp, o_data.name) }};

CREATE FOREIGN TABLE {{ conn|qtIdent(o_data.basensp, o_data.name) }}(
{% if columns %}
{% for c in columns %}
{% if (not c.inheritedfrom or c.inheritedfrom =='' or  c.inheritedfrom == None or  c.inheritedfrom == 'None' ) %}
{% if is_columns.append('1') %}{% endif %}
    {{conn|qtIdent(c.attname)}} {% if is_sql %}{{ c.fulltype }}{% else %}{{c.datatype }}{% if c.typlen %}({{c.typlen}}{% if c.precision %}, {{c.precision}}{% endif %}){% endif %}{% if c.isArrayType %}[]{% endif %}{% endif %}{% if c.coloptions %}
{% for o in c.coloptions %}{% if o.option is defined and o.value is defined %}
{% if loop.first %} OPTIONS ({% endif %}{% if not loop.first %}, {% endif %}{{o.option}} {{o.value|qtLiteral(conn)}}{% if loop.last %}){% endif %}{% endif %}
{% endfor %}{% endif %}
{% if c.attnotnull %} NOT NULL{% else %} NULL{% endif %}
{% if c.typdefault is defined and c.typdefault is not none %} DEFAULT {{c.typdefault}}{% endif %}
{% if c.collname %} COLLATE {{c.collname}}{% endif %}
{% if not loop.last %},
{% endif %}
{% endif %}
{% endfor %}
{% endif %}

)
{% if inherits %}
    INHERITS ({% for i in inherits %}{% if i %}{{i}}{% if not loop.last %}, {% endif %}{% endif %}{% endfor %})
{% endif %}
    SERVER {{ conn|qtIdent(data.ftsrvname) }}{% if ftoptions %}

{% for o in ftoptions %}
{% if o.option is defined and o.value is defined %}
{% if loop.first %}    OPTIONS ({% endif %}{% if not loop.first %}, {% endif %}{{o.option}} {{o.value|qtLiteral(conn)}}{% if loop.last %}){% endif %}{% endif %}
{% endfor %}{% endif %};
{% if data.owner or o_data.owner%}

ALTER FOREIGN TABLE {{ conn|qtIdent(o_data.basensp, o_data.name) }}
    OWNER TO {% if data.owner %}{{ conn|qtIdent(data.owner) }}{% else %}{{ conn|qtIdent(o_data.owner) }}{% endif %};
{% endif -%}
{% if constraints %}
{% for c in constraints %}

ALTER FOREIGN TABLE {{ conn|qtIdent(o_data.basensp, o_data.name) }}
    ADD CONSTRAINT {{ conn|qtIdent(c.conname) }} CHECK ({{ c.consrc }}){% if not c.convalidated %} NOT VALID{% endif %}{% if c.connoinherit %} NO INHERIT{% endif %};
{% endfor %}
{% endif %}
{% if data.description %}

COMMENT ON FOREIGN TABLE {{ conn|qtIdent(o_data.basensp, o_data.name) }}
    IS '{{ data.description }}';
{ % elif o_data.description %}

COMMENT ON FOREIGN TABLE {{ conn|qtIdent(o_data.basensp, o_data.name) }}
    IS '{{ o_data.description }}';
{% endif -%}
{% if acl %}

{% for priv in acl %}
{{ PRIVILEGE.SET(conn, 'TABLE', priv.grantee, o_data.name, priv.without_grant, priv.with_grant, o_data.basensp) }}
{% endfor -%}
{% endif -%}
{% if data.seclabels %}
{% for r in data.seclabels %}
{% if r.label and r.provider %}

{{ SECLABEL.SET(conn, 'FOREIGN TABLE', o_data.name, r.provider, r.label, o_data.basensp) }}
{% endif %}
{% endfor %}
{% endif %}
