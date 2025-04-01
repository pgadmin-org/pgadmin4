{# UPDATE statement for FTS DICTIONARY #}
{% if data %}
{% set name = o_data.name %}
{% set schema = o_data.schema %}
{% if data.name and data.name != o_data.name %}
{% set name = data.name %}
ALTER TEXT SEARCH DICTIONARY {{conn|qtIdent(o_data.schema)}}.{{conn|qtIdent(o_data.name)}}
    RENAME TO {{ conn|qtIdent(data.name) }};

{% endif %}
{% if 'options' in data %}
{% if'changed' in data.options %}
{% for opt in data.options.changed %}
ALTER TEXT SEARCH DICTIONARY {{conn|qtIdent(o_data.schema)}}.{{conn|qtIdent(name)}}
    ({{opt.option}}={{opt.value}});

{% endfor %}
{% endif %}
{% if'added' in data.options%}
{% for opt in data.options.added %}
ALTER TEXT SEARCH DICTIONARY {{conn|qtIdent(o_data.schema)}}.{{conn|qtIdent(name)}}
    ({{opt.option}}={{opt.value}});

{% endfor %}
{% endif %}
{% if'deleted' in data.options%}
{% for opt in data.options.deleted %}
ALTER TEXT SEARCH DICTIONARY {{conn|qtIdent(o_data.schema)}}.{{conn|qtIdent(name)}}
    ({{opt.option}});

{% endfor %}
{% endif %}
{% endif %}
{% if 'owner' in data and data.owner != o_data.owner %}
ALTER TEXT SEARCH DICTIONARY {{conn|qtIdent(o_data.schema)}}.{{conn|qtIdent(name)}}
    OWNER TO {{data.owner}};

{% endif %}
{% if 'schema' in data and data.schema != o_data.schema %}
{% set schema = data.schema%}
ALTER TEXT SEARCH DICTIONARY {{conn|qtIdent(o_data.schema)}}.{{conn|qtIdent(name)}}
    SET SCHEMA {{data.schema}};

{% endif %}
{% if 'description' in data and data.description != o_data.description %}
COMMENT ON TEXT SEARCH DICTIONARY {{conn|qtIdent(schema)}}.{{conn|qtIdent(name)}}
    IS {{ data.description|qtLiteral(conn) }};
{% endif %}
{% endif %}
