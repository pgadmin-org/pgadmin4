{# UPDATE statement for FTS CONFIGURATION #}
{% if data %}
{% set name = o_data.name %}
{% set schema = o_data.schema %}
{% if data.name and data.name != o_data.name %}
{% set name = data.name %}
ALTER TEXT SEARCH CONFIGURATION {{conn|qtIdent(o_data.schema)}}.{{conn|qtIdent(o_data.name)}}
    RENAME TO {{conn|qtIdent(data.name)}};

{% endif %}
{% if 'tokens' in data %}
{% if'changed' in data.tokens %}
{% for tok in data.tokens.changed %}
ALTER TEXT SEARCH CONFIGURATION {{conn|qtIdent(o_data.schema)}}.{{conn|qtIdent(name)}}
    ALTER MAPPING FOR {{tok.token}}
    WITH {% for dict in tok.dictname %}{{dict}}{% if not loop.last %}, {% endif %}{% endfor %};

{% endfor %}
{% endif %}
{% if'added' in data.tokens %}
{% for tok in data.tokens.added %}
ALTER TEXT SEARCH CONFIGURATION {{conn|qtIdent(o_data.schema)}}.{{conn|qtIdent(name)}}
    ADD MAPPING FOR {{tok.token}}
    WITH {% for dict in tok.dictname %}{{dict}}{% if not loop.last %}, {% endif %}{% endfor %};

{% endfor %}
{% endif %}
{% if'deleted' in data.tokens %}
{% for tok in data.tokens.deleted %}
ALTER TEXT SEARCH CONFIGURATION {{conn|qtIdent(o_data.schema)}}.{{conn|qtIdent(name)}}
    DROP MAPPING FOR {{tok.token}};

{% endfor %}
{% endif %}
{% endif %}
{% if 'owner' in data and data.owner != '' and data.owner != o_data.owner %}
ALTER TEXT SEARCH CONFIGURATION {{conn|qtIdent(o_data.schema)}}.{{conn|qtIdent(name)}}
    OWNER TO {{data.owner}};

{% endif %}
{% if 'schema' in data and data.schema != o_data.schema %}
{% set schema = data.schema%}
ALTER TEXT SEARCH CONFIGURATION {{conn|qtIdent(o_data.schema)}}.{{conn|qtIdent(name)}}
    SET SCHEMA {{conn|qtIdent(data.schema)}};

{% endif %}
{% if 'description' in data and data.description != o_data.description %}
COMMENT ON TEXT SEARCH CONFIGURATION {{conn|qtIdent(schema)}}.{{conn|qtIdent(name)}}
    IS {{ data.description|qtLiteral }};
{% endif %}
{% endif %}
