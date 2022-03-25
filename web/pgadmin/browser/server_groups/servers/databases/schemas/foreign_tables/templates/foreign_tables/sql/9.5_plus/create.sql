{% import 'macros/schemas/security.macros' as SECLABEL %}
{% import 'macros/schemas/privilege.macros' as PRIVILEGE %}
{% set is_columns = [] %}
{% if data %}
CREATE FOREIGN TABLE{% if add_not_exists_clause %} IF NOT EXISTS{% endif %} {{ conn|qtIdent(data.basensp, data.name) }}(
{% if data.columns %}
{% for c in data.columns %}
{% if (not c.inheritedfrom or c.inheritedfrom =='' or  c.inheritedfrom == None or  c.inheritedfrom == 'None' ) %}
{% if is_columns.append('1') %}{% endif %}
    {{conn|qtIdent(c.attname)}} {% if is_sql %}{{ c.fulltype }}{% else %}{{c.datatype }}{% if c.typlen %}({{c.typlen}}{% if c.precision %}, {{c.precision}}{% endif %}){% endif %}{% if c.isArrayType %}[]{% endif %}{% endif %}{% if c.coloptions %}
{% for o in c.coloptions %}{% if o.option is defined and o.value is defined %}
{% if loop.first %} OPTIONS ({% endif %}{% if not loop.first %}, {% endif %}{{o.option}} {{o.value|qtLiteral}}{% if loop.last %}){% endif %}{% endif %}
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
{% if data.inherits %}
    INHERITS ({% for i in data.inherits %}{% if i %}{{i}}{% if not loop.last %}, {% endif %}{% endif %}{% endfor %})
{% endif %}
    SERVER {{ conn|qtIdent(data.ftsrvname) }}{% if data.ftoptions %}

{% for o in data.ftoptions %}
{% if o.option is defined and o.value is defined %}
{% if loop.first %}    OPTIONS ({% endif %}{% if not loop.first %}, {% endif %}{{o.option}} {{o.value|qtLiteral}}{% if loop.last %}){% endif %}{% endif %}
{% endfor %}{% endif %};
{% if data.owner %}

ALTER FOREIGN TABLE {{ conn|qtIdent(data.basensp, data.name) }}
    OWNER TO {{ conn|qtIdent(data.owner) }};
{% endif -%}
{% if data.constraints %}
{% for c in data.constraints %}

ALTER FOREIGN TABLE {{ conn|qtIdent(data.basensp, data.name) }}
    ADD CONSTRAINT {{ conn|qtIdent(c.conname) }} CHECK ({{ c.consrc }}){% if not c.convalidated %} NOT VALID{% endif %}{% if c.connoinherit %} NO INHERIT{% endif %};
{% endfor %}
{% endif %}
{% if data.description %}

COMMENT ON FOREIGN TABLE {{ conn|qtIdent(data.basensp, data.name) }}
    IS '{{ data.description }}';
{% endif -%}
{% if data.acl %}

{% for priv in data.acl %}
{{ PRIVILEGE.SET(conn, 'TABLE', priv.grantee, data.name, priv.without_grant, priv.with_grant, data.basensp) }}
{% endfor -%}
{% endif -%}
{% if data.seclabels %}
{% for r in data.seclabels %}
{% if r.label and r.provider %}

{{ SECLABEL.SET(conn, 'FOREIGN TABLE', data.name, r.provider, r.label, data.basensp) }}
{% endif %}
{% endfor %}
{% endif %}
{% endif %}
