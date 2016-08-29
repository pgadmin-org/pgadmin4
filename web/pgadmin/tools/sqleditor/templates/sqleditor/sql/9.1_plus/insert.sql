{# Insert the new row with primary keys (specified in primary_keys) #}
INSERT INTO {{ conn|qtIdent(nsp_name, object_name) }} (
{% for col in data_to_be_saved %}
{% if not loop.first %}, {% endif %}{{ conn|qtIdent(col) }}{% endfor %}
) VALUES (
{% for col in data_to_be_saved %}
{########################################################}
{# THIS IS TO CHECK IF DATA TYPE IS ARRAY? #}
{% if data_type[col].endswith('[]') %}
{% set col_value = "{%s}"|format(data_to_be_saved[col])|qtLiteral %}
{% else %}
{% set col_value = data_to_be_saved[col]|qtLiteral %}
{% endif %}
{########################################################}
{% if not loop.first %}, {% endif %}{{ col_value }}::{{data_type[col]}}{% endfor %}
);