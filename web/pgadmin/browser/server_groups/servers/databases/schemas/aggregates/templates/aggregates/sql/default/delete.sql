{% if data %}
DROP AGGREGATE IF EXISTS {{conn|qtIdent(data.schema, data.name)}}({% if data.input_types %}{{data.input_types}}{% endif %}){% if cascade %} CASCADE{% endif %};
{% endif %}
