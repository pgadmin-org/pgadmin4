{# Update the row with primary keys (specified in primary_keys) #}
UPDATE {{ conn|qtIdent(nsp_name, object_name) }} SET
{% for col in data_to_be_saved %}
{% if not loop.first %}, {% endif %}{{ conn|qtIdent(col) }} = %({{ pgadmin_alias[col] }})s{% if type_cast_required[col] %}::{{ data_type[col] }}{% endif %}{% endfor %}
 WHERE
{% for pk in primary_keys %}
{% if not loop.first %} AND {% endif %}{{ conn|qtIdent(pk) }} = {{ primary_keys[pk]|qtLiteral }}{% endfor %};
