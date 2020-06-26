{% import 'macros/schemas/security.macros' as SECLABEL %}
{% import 'macros/schemas/privilege.macros' as PRIVILEGE %}
{% if data %}
{% set name = o_data.name %}
{% if data.name %}{% if data.name != o_data.name %}
ALTER FOREIGN TABLE {{ conn|qtIdent(o_data.basensp, o_data.name) }}
    RENAME TO {{ conn|qtIdent(data.name) }};

{% set name = data.name %}
{% endif %}{% endif %}
{% if data.owner %}
ALTER FOREIGN TABLE {{ conn|qtIdent(o_data.basensp, name) }}
    OWNER TO {{ conn|qtIdent(data.owner) }};

{% endif %}
{% if data.columns %}
{% for c in data.columns.deleted %}
{% if (not c.inheritedfrom or c.inheritedfrom =='' or  c.inheritedfrom == None or  c.inheritedfrom == 'None' ) %}
ALTER FOREIGN TABLE {{ conn|qtIdent(o_data.basensp, name) }}
    DROP COLUMN {{conn|qtIdent(c.attname)}};

{% endif %}
{% endfor -%}
{% for c in data.columns.added %}
{% if (not c.inheritedfrom or c.inheritedfrom =='' or  c.inheritedfrom == None or  c.inheritedfrom == 'None' ) %}
ALTER FOREIGN TABLE {{ conn|qtIdent(o_data.basensp, name) }}
    ADD COLUMN {{conn|qtIdent(c.attname)}} {{ c.datatype }}{% if c.typlen %}({{c.typlen}}{% if c.precision %}, {{c.precision}}{% endif %}){% endif %}{% if c.isArrayType %}[]{% endif %}
{% if c.coloptions %}
{% for o in c.coloptions %}{% if o.option and o.value %}
{% if loop.first %} OPTIONS ({% endif %}{% if not loop.first %}, {% endif %}{{o.option}} {{o.value|qtLiteral}}{% if loop.last %}){% endif %}{% endif %}
{% endfor %}{% endif %}
{% if c.attnotnull %} NOT NULL{% else %} NULL{% endif %}
{% if c.typdefault is defined and c.typdefault is not none %} DEFAULT {{c.typdefault}}{% endif %}
{% if c.collname %} COLLATE {{c.collname}}{% endif %};

{% endif %}
{% endfor -%}
{% for c in data.columns.changed %}
{% set col_name = o_data['columns'][c.attnum]['attname'] %}
{% if c.attname != o_data['columns'][c.attnum]['attname'] %}
{% set col_name = c.attname %}
ALTER FOREIGN TABLE {{ conn|qtIdent(o_data.basensp, name) }}
    RENAME COLUMN {{conn|qtIdent(o_data['columns'][c.attnum]['attname'])}} TO {{conn|qtIdent(c.attname)}};

{% endif %}
{% if c.attnotnull != o_data['columns'][c.attnum]['attnotnull'] %}
ALTER FOREIGN TABLE {{ conn|qtIdent(o_data.basensp, name) }}
    ALTER COLUMN {{conn|qtIdent(col_name)}}{% if c.attnotnull %} SET{% else %} DROP{% endif %} NOT NULL;

{% endif %}
{% if c.datatype != o_data['columns'][c.attnum]['datatype'] or c.typlen != o_data['columns'][c.attnum]['typlen'] or
c.precision != o_data['columns'][c.attnum]['precision'] %}
ALTER FOREIGN TABLE {{ conn|qtIdent(o_data.basensp, name) }}
    ALTER COLUMN {{conn|qtIdent(col_name)}} TYPE {{ c.datatype }}{% if c.typlen %}({{c.typlen}}{% if c.precision %}, {{c.precision}}{% endif %}){% endif %}{% if c.isArrayType %}[]{% endif %};

{% endif %}
{% if c.typdefault is defined and c.typdefault != o_data['columns'][c.attnum]['typdefault'] %}
ALTER FOREIGN TABLE {{ conn|qtIdent(o_data.basensp, name) }}
    ALTER COLUMN {{conn|qtIdent(col_name)}}{% if c.typdefault is defined and c.typdefault != '' %} SET DEFAULT {{c.typdefault}}{% else %} DROP DEFAULT{% endif %};

{% endif %}
{% if c.attstattarget != o_data['columns'][c.attnum]['attstattarget'] %}
ALTER FOREIGN TABLE {{ conn|qtIdent(o_data.basensp, name) }}
    ALTER COLUMN {{conn|qtIdent(col_name)}} SET STATISTICS {% if c.attstattarget %}{{c.attstattarget}}{% else %}-1{% endif %};

{% endif %}
{% if c.coloptions_updated %}
{% for o in c.coloptions_updated.deleted %}
{% if o.option %}
{% if loop.first %}ALTER FOREIGN TABLE {{ conn|qtIdent(o_data.basensp, name) }}
    ALTER COLUMN {{conn|qtIdent(col_name)}} OPTIONS (DROP {% endif %}{% if not loop.first %}, {% endif %}{{o.option}}{% if loop.last %}){% endif %};
{% endif %}
{% endfor %}
{% for o in c.coloptions_updated.added %}
{% if o.option and o.value %}
{% if loop.first %}ALTER FOREIGN TABLE {{ conn|qtIdent(o_data.basensp, name) }}
    ALTER COLUMN {{conn|qtIdent(col_name)}} OPTIONS (ADD {% endif %}{% if not loop.first %}, {% endif %}{{o.option}} {{o.value|qtLiteral}}{% if loop.last %});{% endif %}
{% endif %}
{% endfor %}
{% for o in c.coloptions_updated.changed %}
{% if o.option and o.value %}
{% if loop.first %}ALTER FOREIGN TABLE {{ conn|qtIdent(o_data.basensp, name) }}
    ALTER COLUMN {{conn|qtIdent(col_name)}} OPTIONS (SET {% endif %}{% if not loop.first %}, {% endif %}{{o.option}} {{o.value|qtLiteral}}{% if loop.last %});{% endif %}
{% endif %}
{% endfor %}
{% endif -%}
{% endfor %}
{% endif %}
{% if data.inherits and data.inherits|length > 0%}
{% if o_data.inherits == None or o_data.inherits == 'None' %}
{% set inherits = '' %}
{% else %}
{% set inherits = o_data.inherits %}
{% endif %}
{% for i in data.inherits %}
{% if i not in inherits %}{% if i %}
ALTER FOREIGN TABLE {{ conn|qtIdent(o_data.basensp, name) }} INHERIT {{i}};
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
ALTER FOREIGN TABLE {{ conn|qtIdent(o_data.basensp, name) }} NO INHERIT {{i}};{% endif %}
{% endif %}
{% endfor %}
{% endif %}
{% if data.constraints %}
{% for c in data.constraints.deleted %}
ALTER FOREIGN TABLE {{ conn|qtIdent(o_data.basensp, name) }}
    DROP CONSTRAINT {{conn|qtIdent(c.conname)}};

{% endfor -%}
{% for c in data.constraints.added %}
ALTER FOREIGN TABLE {{ conn|qtIdent(o_data.basensp, name) }}
    ADD CONSTRAINT {{ conn|qtIdent(c.conname) }} CHECK ({{ c.consrc }}){% if not c.convalidated %} NOT VALID{% endif %}{% if c.connoinherit %} NO INHERIT{% endif %};

{% endfor %}
{% if data.is_schema_diff is defined and data.is_schema_diff %}
{% for c in data.constraints.changed %}
ALTER FOREIGN TABLE {{ conn|qtIdent(o_data.basensp, name) }}
    DROP CONSTRAINT {{conn|qtIdent(c.conname)}};

ALTER FOREIGN TABLE {{ conn|qtIdent(o_data.basensp, name) }}
    ADD CONSTRAINT {{ conn|qtIdent(c.conname) }} CHECK ({{ c.consrc }}){% if not c.convalidated %} NOT VALID{% endif %}{% if c.connoinherit %} NO INHERIT{% endif %};

{% endfor %}
{% else %}
{% for c in data.constraints.changed %}
{% if c.convalidated %}
ALTER FOREIGN TABLE {{ conn|qtIdent(o_data.basensp, name) }}
    VALIDATE CONSTRAINT {{ conn|qtIdent(c.conname) }};

{% endif %}
{% endfor %}
{% endif %}
{% endif %}
{% if data.ftoptions %}
{% for o in data.ftoptions.deleted %}
{% if o.option and o.value %}
ALTER FOREIGN TABLE {{ conn|qtIdent(o_data.basensp, name) }}
    OPTIONS ( DROP {{o.option}});

{% endif %}
{% endfor %}
{% for o in data.ftoptions.added %}
{% if o.option and o.value %}
ALTER FOREIGN TABLE {{ conn|qtIdent(o_data.basensp, name) }}
    OPTIONS (ADD {{o.option}} {{o.value|qtLiteral}});

{% endif %}
{% endfor %}
{% for o in data.ftoptions.changed %}
{% if o.option and o.value %}
ALTER FOREIGN TABLE {{ conn|qtIdent(o_data.basensp, name) }}
    OPTIONS (SET {{o.option}} {{o.value|qtLiteral}});

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
    IS {{ data.description|qtLiteral }};

{% endif -%}
{% if data.acl %}
{% if 'deleted' in data.acl %}
{% for priv in data.acl.deleted %}
{{ PRIVILEGE.UNSETALL(conn, 'TABLE', priv.grantee, name, o_data.basensp) }}

{% endfor %}
{% endif -%}
{% if 'changed' in data.acl %}
{% for priv in data.acl.changed %}
{{ PRIVILEGE.UNSETALL(conn, 'TABLE', priv.grantee, name, o_data.basensp) }}

{{ PRIVILEGE.SET(conn, 'TABLE', priv.grantee, name, priv.without_grant, priv.with_grant, o_data.basensp) }}

{% endfor %}
{% endif -%}
{% if 'added' in data.acl %}
{% for priv in data.acl.added %}
{{ PRIVILEGE.SET(conn, 'TABLE', priv.grantee, name, priv.without_grant, priv.with_grant, o_data.basensp) }}

{% endfor %}
{% endif %}
{% endif -%}
{% if data.basensp %}
ALTER FOREIGN TABLE {{ conn|qtIdent(o_data.basensp, name) }}
    SET SCHEMA {{ conn|qtIdent(data.basensp) }};
{% endif %}
{% endif %}
