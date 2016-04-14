{# Delete the row with primary keys (specified in primary_keys) #}
DELETE FROM {{ conn|qtIdent(nsp_name, object_name) }} WHERE
{% for pk in primary_keys %}
{% if not loop.first %} AND {% endif %}{{ conn|qtIdent(pk) }} = {{ primary_keys[pk]|qtLiteral }}{% endfor %};