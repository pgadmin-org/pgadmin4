{# =============Update extension schema============= #}
{% if data.schema and data.schema != o_data.schema %}
ALTER EXTENSION {{ conn|qtIdent(o_data.name) }}
    SET SCHEMA {{ conn|qtIdent(data.schema) }};
{% endif %}
{# =============Update extension version============= #}
{% if data.version and data.version != o_data.version %}
ALTER EXTENSION {{ conn|qtIdent(o_data.name) }}
    UPDATE TO {{ conn|qtIdent(data.version) }};
{% endif %}
