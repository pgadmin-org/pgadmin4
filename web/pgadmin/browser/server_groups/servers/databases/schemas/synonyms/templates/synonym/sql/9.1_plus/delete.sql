{% set is_public = False %}
{% if data.schema == 'public' %}
{% set is_public = True %}
{% endif %}
DROP {% if is_public %}
PUBLIC SYNONYM {{ conn|qtIdent(data.name) }}{% else %}
SYNONYM {{ conn|qtIdent(data.schema, data.name) }}
{% endif %};
