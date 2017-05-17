{# CREATE FTS DICTIONARY Statement #}
{% if data and data.schema and data.name and data.template %}
CREATE TEXT SEARCH DICTIONARY {{ conn|qtIdent(data.schema, data.name) }} (
    TEMPLATE = {{ data.template }}{% for variable in data.options %}{% if "option" in variable and variable.option != '' %},
    {{ conn|qtIdent(variable.option) }} = {% if is_displaying %}{{ variable.value }}{% else %}{{ variable.value|qtLiteral }}{% endif %}{% endif %}{% endfor %}

);
{# Description for FTS_DICTIONARY #}

{% if data.description %}
COMMENT ON TEXT SEARCH DICTIONARY {{ conn|qtIdent(data.schema, data.name) }}
    IS {{ data.description|qtLiteral }};
{% endif %}{% endif %}