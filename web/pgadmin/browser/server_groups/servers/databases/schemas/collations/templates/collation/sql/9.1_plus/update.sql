{% if data %}
{# Change object's owner #}
{% if data.owner and data.owner != o_data.owner %}
ALTER COLLATION {{ conn|qtIdent(o_data.schema, o_data.name) }}
    OWNER TO {{ conn|qtIdent(data.owner) }};

{% endif %}
{# Change object's comment  #}
{% if data.description is defined and data.description != o_data.description %}
COMMENT ON COLLATION {{ conn|qtIdent(o_data.schema, o_data.name) }}
    IS {{ data.description|qtLiteral }};

{% endif %}
{# Change object name #}
{% if data.name and data.name != o_data.name %}
ALTER COLLATION {{ conn|qtIdent(o_data.schema, o_data.name) }}
    RENAME TO {{ conn|qtIdent(data.name) }};

{% endif %}
{# Change object schema #}
{% if data.schema  and data.schema != o_data.schema %}
ALTER COLLATION {% if data.name and data.name != o_data.name %}{{ conn|qtIdent(o_data.schema, data.name) }}{% else %}{{ conn|qtIdent(o_data.schema, o_data.name) }}{% endif %}

    SET SCHEMA {{ conn|qtIdent(data.schema) }};
{% endif %}
{% endif %}
