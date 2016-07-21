{% import 'macros/schemas/security.macros' as SECLABEL %}
{% if data %}
{% set name = o_data.name %}
{% if data.name %}
{% if data.name != o_data.name %}
ALTER FOREIGN TABLE {{ conn|qtIdent(o_data.basensp, o_data.name) }}
    RENAME TO {{ conn|qtIdent(data.name) }};
{% set name = data.name %}
{% endif %}
{% endif -%}

{% if data.owner %}

ALTER FOREIGN TABLE {{ conn|qtIdent(o_data.basensp, name) }}
    OWNER TO {{ data.owner }};
{% endif -%}

{% if data.columns %}
{% for c in data.columns.deleted %}

ALTER FOREIGN TABLE {{ conn|qtIdent(o_data.basensp, name) }}
    DROP COLUMN {{conn|qtIdent(c.attname)}};
{% endfor -%}
{% for c in data.columns.added %}

ALTER FOREIGN TABLE {{ conn|qtIdent(o_data.basensp, name) }}
    ADD COLUMN {{conn|qtIdent(c.attname)}} {{ conn|qtTypeIdent(c.datatype) }}{% if c.typlen %}({{c.typlen}}{% if c.precision %}, {{c.precision}}{% endif %}){% endif %}{% if c.isArrayType %}[]{% endif %}
{% if c.attnotnull %} NOT NULL{% else %} NULL{% endif %}
{% if c.typdefault %} DEFAULT {{c.typdefault}}{% endif %}
{% if c.collname %} COLLATE {{c.collname}}{% endif %};
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
    ALTER COLUMN {{conn|qtIdent(col_name)}} TYPE {{ conn|qtTypeIdent(c.datatype) }}{% if c.typlen %}({{c.typlen}}{% if c.precision %}, {{c.precision}}{% endif %}){% endif %}{% if c.isArrayType %}[]{% endif %};
{% endif %}
{% if c.typdefault != o_data['columns'][c.attnum]['typdefault'] %}

ALTER FOREIGN TABLE {{ conn|qtIdent(o_data.basensp, name) }}
    ALTER COLUMN {{conn|qtIdent(col_name)}}{% if c.typdefault %} SET DEFAULT {{c.typdefault}}{% else %} DROP DEFAULT{% endif %};
{% endif %}
{% endfor %}
{% endif -%}
{% if data.ftoptions %}
{% for o in data.ftoptions.deleted %}
{% if o.option and o.value %}

ALTER FOREIGN TABLE {{ conn|qtIdent(o_data.basensp, name) }}
    OPTIONS (DROP {{o.option}});
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
{% endif -%}
{% if 'added' in seclabels and seclabels.added|length > 0 %}
{% for r in seclabels.added %}

{{ SECLABEL.SET(conn, 'FOREIGN TABLE', name, r.provider, r.label, o_data.basensp) }}
{% endfor %}
{% endif -%}
{% if 'changed' in seclabels and seclabels.changed|length > 0 %}
{% for r in seclabels.changed %}

{{ SECLABEL.SET(conn, 'FOREIGN TABLE', name, r.provider, r.label, o_data.basensp) }}
{% endfor %}
{% endif -%}
{% if data.description is defined and data.description != o_data.description%}

COMMENT ON FOREIGN TABLE {{ conn|qtIdent(o_data.basensp, name) }}
    IS {{ data.description|qtLiteral }};
{% endif -%}
{% if data.basensp %}

ALTER FOREIGN TABLE {{ conn|qtIdent(o_data.basensp, name) }}
    SET SCHEMA {{ conn|qtIdent(data.basensp) }};
{% endif %}
{% endif %}
