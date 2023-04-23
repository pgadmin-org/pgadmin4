{% import 'macros/schemas/security.macros' as SECLABEL %}

-- WARNING:
-- We have found the difference in either of datatype or collation,
-- so we need to drop the existing domain first and re-create it.
DROP DOMAIN {{ conn|qtIdent(o_data.basensp, o_data.name) }};

CREATE DOMAIN {{ conn|qtIdent(o_data.basensp, o_data.name) }}
    AS {% if data.fulltype %}{{ data.fulltype }}{% else %}{{ o_data.fulltype }}{% endif %}{% if data.collname and data.collname != "pg_catalog.\"default\"" %}

    COLLATE {{ data.collname }}{% endif %}{% if data.typdefault %}

    DEFAULT {{ data.typdefault }}{% endif %}{% if data.typnotnull %}

    NOT NULL{% endif %};

{% if data.owner or o_data.owner %}
ALTER DOMAIN {{ conn|qtIdent(o_data.basensp, o_data.name) }} OWNER TO {% if data.owner %}{{ conn|qtIdent(data.owner) }}{% else %}{{ conn|qtIdent(o_data.owner) }}{% endif %};
{% endif %}
{% if data.constraints %}
{% for c in data.constraints.added %}{% if c.conname and c.consrc %}

ALTER DOMAIN {{ conn|qtIdent(o_data.basensp, o_data.name) }}
    ADD CONSTRAINT {{ conn|qtIdent(c.conname) }} CHECK ({{ c.consrc }}){% if not c.convalidated %} NOT VALID{% endif %}{% endif -%};
{% if c.description %}

COMMENT ON CONSTRAINT {{ conn|qtIdent(c.conname) }} ON DOMAIN {{ conn|qtIdent(o_data.basensp, o_data.name) }}
    IS '{{ c.description }}';
{% endif %}
{% endfor -%}
{% for c in data.constraints.changed %}{% if c.conname and c.consrc %}

ALTER DOMAIN {{ conn|qtIdent(o_data.basensp, o_data.name) }}
    ADD CONSTRAINT {{ conn|qtIdent(c.conname) }} CHECK ({{ c.consrc }}){% if not c.convalidated %} NOT VALID{% endif %}{% endif -%};
{% if c.description %}

COMMENT ON CONSTRAINT {{ conn|qtIdent(c.conname) }} ON DOMAIN {{ conn|qtIdent(o_data.basensp, o_data.name) }}
    IS '{{ c.description }}';
{% endif %}
{% endfor -%}
{% endif %}

{% if data.description %}
COMMENT ON DOMAIN {{ conn|qtIdent(o_data.basensp, o_data.name) }}
    IS '{{ data.description }}';{% endif -%}

{% if data.seclabels %}
{% for r in data.seclabels %}
{% if r.label and r.provider %}


{{ SECLABEL.SET(conn, 'DOMAIN', data.name, r.provider, r.label, data.basensp) }}{% endif -%}
{% endfor -%}
{% endif -%}
