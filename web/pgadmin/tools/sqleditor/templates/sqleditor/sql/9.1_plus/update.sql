{# Update the row with primary keys (specified in primary_keys) #}
UPDATE {{ conn|qtIdent(nsp_name, object_name) }} SET
{% for col in data_to_be_saved %}
{########################################################}
{# THIS IS TO CHECK IF DATA TYPE IS ARRAY? #}
{% if data_type[col].endswith('[]') %}
{% set col_value = "{%s}"|format(data_to_be_saved[col])|qtLiteral %}
{% else %}
{% set col_value = data_to_be_saved[col]|qtLiteral %}
{% endif %}
{########################################################}
{% if not loop.first %}, {% endif %}{{ conn|qtIdent(col) }} = {{ col_value }}::{{data_type[col]}}{% endfor %}
 WHERE
{% for pk in primary_keys %}
{% if not loop.first %} AND {% endif %}{{ conn|qtIdent(pk) }} = {{ primary_keys[pk]|qtLiteral }}{% endfor %};