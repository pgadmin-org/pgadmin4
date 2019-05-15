{% set is_public = False %}
{% if data.schema == 'public' %}
{% set is_public = True %}
{% endif %}
{% if comment %}
-- {% if is_public %}Public{% else %}Private{% endif %} synonym: {% if is_public %}{{ conn|qtIdent(data.name) }};
{% else %}{{ conn|qtIdent(data.schema, data.name) }};
{% endif %}

-- DROP {% if is_public %}PUBLIC {% endif %}SYNONYM {% if is_public %}{{ conn|qtIdent(data.name) }};
{% else %}{{ conn|qtIdent(data.schema, data.name) }};
{% endif %}

{% endif %}
CREATE OR REPLACE {% if is_public %}
PUBLIC SYNONYM {{ conn|qtIdent(data.name) }}
{% else %}
SYNONYM {{ conn|qtIdent(data.schema, data.name) }}
{% endif %}
    FOR {{ conn|qtIdent(data.synobjschema, data.synobjname) }};

