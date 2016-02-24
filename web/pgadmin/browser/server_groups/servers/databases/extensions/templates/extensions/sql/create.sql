{#=========================Create new extension======================#}
{#===Generates comments and code for SQL tab===#}
{% if display_comments %}
-- Extension: {{ conn|qtIdent(data.name) }}

-- DROP EXTENSION {{ conn|qtIdent(data.name) }};

{% endif %}
{% if data.name %}
CREATE EXTENSION {{ conn|qtIdent(data.name) }}{% if data.schema == '' and data.version == '' %};{% endif %}
{% if data.schema %}

    SCHEMA {{ conn|qtIdent(data.schema) }}{% if data.version == '' %};{% endif %}
{% endif %}
{% if data.version %}

    VERSION {{ conn|qtIdent(data.version) }};
{% endif %}
{% endif %}
