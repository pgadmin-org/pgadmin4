{% import 'macros/schemas/security.macros' as SECLABEL %}
{% if data %}
CREATE DOMAIN {{ conn|qtIdent(data.basensp, data.name) }}
    AS {{ conn|qtTypeIdent(data.basetype) }}{% if data.typlen %}({{data.typlen}}{% if data.precision %},{{data.precision}}{% endif %}){% endif %}{% if data.collname %}

    COLLATE {{ data.collname }}{% endif %}{% if data.typdefault %}

    DEFAULT {{ data.typdefault }}{% endif %}{% if data.typnotnull %}

    NOT NULL{% endif %}{% if data.constraints %}{% for c in data.constraints %}{% if c.conname and c.consrc %}

    CONSTRAINT {{ conn|qtIdent(c.conname) }} CHECK ({{ c.consrc }}){% endif -%}
{% endfor -%}
{% endif -%};

{% if data.owner %}
ALTER DOMAIN {{ conn|qtIdent(data.basensp, data.name) }} OWNER TO {{ conn|qtIdent(data.owner) }};{% endif %}{% if data.description %}


COMMENT ON DOMAIN {{ conn|qtIdent(data.basensp, data.name) }}
    IS '{{ data.description }}';{% endif -%}{% if data.seclabels %}
{% for r in data.seclabels %}
{% if r.label and r.provider %}


{{ SECLABEL.SET(conn, 'DOMAIN', data.name, r.provider, r.label, data.basensp) }}{% endif -%}
{% endfor -%}
{% endif -%}

{% endif -%}
