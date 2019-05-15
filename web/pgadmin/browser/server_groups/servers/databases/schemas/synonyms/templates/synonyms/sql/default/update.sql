{% set is_public = False %}
{% if o_data.schema == 'public' %}
{% set is_public = True %}
{% endif %}
CREATE OR REPLACE {% if is_public %}
PUBLIC SYNONYM {{ conn|qtIdent(o_data.name) }}
{% else %}
SYNONYM {{ conn|qtIdent(o_data.schema, o_data.name) }}
{% endif %}
       FOR {{ conn|qtIdent(data.synobjschema, data.synobjname) }};