{# Delete the row with primary keys #}
DELETE FROM {{ conn|qtIdent(nsp_name, object_name) }} WHERE
{% for pk_key in data %}
{% if not loop.first %} AND {% endif %}{{ conn|qtIdent(pk_key) }} = {{ data[pk_key]|qtLiteral }}{% endfor %};