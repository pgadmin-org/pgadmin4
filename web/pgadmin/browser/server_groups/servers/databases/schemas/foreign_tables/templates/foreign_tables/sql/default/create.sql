{% import 'macros/schemas/security.macros' as SECLABEL %}
{% import 'macros/schemas/privilege.macros' as PRIVILEGE %}
{% import 'macros/variable.macros' as VARIABLE %}
{% set is_columns = [] %}
{% if data %}
CREATE FOREIGN TABLE{% if add_not_exists_clause %} IF NOT EXISTS{% endif %} {{ conn|qtIdent(data.basensp, data.name) }}(
{% if data.columns %}
{% for c in data.columns %}
{% if (not c.inheritedfrom or c.inheritedfrom =='' or  c.inheritedfrom == None or  c.inheritedfrom == 'None' ) %}
{% if is_columns.append('1') %}{% endif %}
    {{conn|qtIdent(c.name)}} {% if is_sql %}{{ c.fulltype }}{% else %}{{c.cltype }}{% if c.attlen %}({{c.attlen}}{% if c.attprecision %}, {{c.attprecision}}{% endif %}){% endif %}{% if c.isArrayType %}[]{% endif %}{% endif %}{% if c.coloptions %}
{% for o in c.coloptions %}{% if o.option is defined and o.value is defined %}
{% if loop.first %} OPTIONS ({% endif %}{% if not loop.first %}, {% endif %}{{o.option}} {{o.value|qtLiteral(conn)}}{% if loop.last %}){% endif %}{% endif %}
{% endfor %}{% endif %}
{% if c.attnotnull %} NOT NULL{% endif %}
{% if c.defval is defined and c.defval is not none and c.defval != '' and c.colconstype != 'g' %} DEFAULT {{c.defval}}{% endif %}
{% if c.colconstype == 'g' and c.genexpr and c.genexpr != '' %}
 GENERATED ALWAYS AS {{c.genexpr}} STORED{% endif %}
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
{% if loop.first %}    OPTIONS ({% endif %}{% if not loop.first %}, {% endif %}{{o.option}} {{o.value|qtLiteral(conn)}}{% if loop.last %}){% endif %}{% endif %}
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
{% if data.columns and data.columns|length > 0 %}
{% for c in data.columns %}
{% if c.description %}

COMMENT ON COLUMN {{conn|qtIdent(data.basensp, data.name, c.name)}}
    IS {{c.description|qtLiteral(conn)}};
{% endif %}
{% endfor %}
{% endif %}
{% if data.relacl %}

{% for priv in data.relacl %}
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

{#===========================================#}
{#  COLUMN SPECIFIC TEMPLATES STARTS HERE    #}
{#===========================================#}
{% if data.columns and data.columns|length > 0 %}
{% for c in data.columns %}
{% if c.description %}

COMMENT ON COLUMN {{conn|qtIdent(data.schema, data.name, c.name)}}
    IS {{c.description|qtLiteral(conn)}};
{% endif %}
{###  Add variables to column ###}
{% if c.attoptions and c.attoptions|length > 0 %}

ALTER TABLE IF EXISTS {{conn|qtIdent(data.schema, data.name)}}
    {{ VARIABLE.SET(conn, 'COLUMN', c.name, c.attoptions) }}

{% endif %}
{###  Alter column statistics value ###}
{% if c.attstattarget is defined and c.attstattarget > -1 %}
ALTER TABLE IF EXISTS {{conn|qtIdent(data.schema, data.name)}}
    ALTER COLUMN {{conn|qtTypeIdent(c.name)}} SET STATISTICS {{c.attstattarget}};

{% endif %}
{###  Alter column storage value ###}
{% if c.attstorage is defined and c.attstorage != c.defaultstorage %}
ALTER TABLE IF EXISTS {{conn|qtIdent(data.schema, data.name)}}
    ALTER COLUMN {{conn|qtTypeIdent(c.name)}} SET STORAGE {%if c.attstorage == 'p' %}
PLAIN{% elif c.attstorage == 'm'%}MAIN{% elif c.attstorage == 'e'%}
EXTERNAL{% elif c.attstorage == 'x'%}EXTENDED{% endif %};

{% endif %}
{% endfor %}
{% endif %}
