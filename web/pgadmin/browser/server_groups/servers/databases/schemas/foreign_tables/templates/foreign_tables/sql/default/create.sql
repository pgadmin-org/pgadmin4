{% import 'macros/schemas/security.macros' as SECLABEL %}
{% if data %}
CREATE FOREIGN TABLE {{ conn|qtIdent(data.basensp, data.name) }}(
{% if data.columns %}
{% for c in data.columns %}
    {{conn|qtIdent(c.attname)}} {{ conn|qtTypeIdent(c.datatype) }}{% if c.typlen %}({{c.typlen}} {% if c.precision %}, {{c.precision}}{% endif %}){% endif %}{% if c.isArrayType %}[]{% endif %}{% if c.attnotnull %}
 NOT NULL{% else %} NULL{% endif %}
{% if not loop.last %},
{% endif %}{% endfor -%}{% endif %}

)
    SERVER {{ conn|qtIdent(data.ftsrvname) }}{% if data.ftoptions %}

{% for o in data.ftoptions %}
{% if o.option and o.value %}
{% if loop.first %}    OPTIONS ({% endif %}{% if not loop.first %}, {% endif %}{{o.option}} {{o.value|qtLiteral}}{% if loop.last %}){% endif %}{% endif %}
{% endfor %}{% endif -%};
{% if data.owner %}

ALTER FOREIGN TABLE {{ conn|qtIdent(data.basensp, data.name) }}
    OWNER TO {{ data.owner }};
{% endif -%}
{% if data.description %}

COMMENT ON FOREIGN TABLE {{ conn|qtIdent(data.basensp, data.name) }}
    IS '{{ data.description }}';
{% endif -%}
{% if data.seclabels %}
{% for r in data.seclabels %}
{% if r.label and r.provider %}

{{ SECLABEL.SET(conn, 'FOREIGN TABLE', data.name, r.provider, r.label, data.basensp) }}
{% endif %}
{% endfor %}
{% endif %}
{% endif %}
