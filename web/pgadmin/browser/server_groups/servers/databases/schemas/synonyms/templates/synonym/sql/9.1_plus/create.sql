{% set is_public = False %}
{% if data.schema == 'public' %}
{% set is_public = True %}
{% endif %}
{% if comment %}
-- {% if is_public %}Public{% else %}Private{% endif %} synonym: {{ conn|qtIdent(data.schema, data.name) }};

-- DROP {% if is_public %}PUBLIC {% endif %}SYNONYM {{ conn|qtIdent(data.schema, data.name) }};

{% endif %}
CREATE OR REPLACE {% if is_public %}
PUBLIC SYNONYM {{ conn|qtIdent(data.name) }}
{% else %}
SYNONYM {{ conn|qtIdent(data.schema, data.name) }}
{% endif %}
    FOR {{ conn|qtIdent(data.synobjschema, data.synobjname) }};

