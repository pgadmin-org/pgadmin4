{#=========================Create new extension======================#}
{#===Generates comments and code for SQL tab===#}
{% if display_comments %}
-- Extension: {{ conn|qtIdent(data.name) }}

-- DROP EXTENSION {{ conn|qtIdent(data.name) }};

{% endif %}
{% if data.name %}
CREATE EXTENSION{% if add_not_exists_clause %} IF NOT EXISTS{% endif %} {{ conn|qtIdent(data.name) }}{% if data.schema == '' and data.version == '' and not data.cascade %};{% endif %}
{% if data.schema %}

    SCHEMA {{ conn|qtIdent(data.schema) }}{% if data.version == '' and not data.cascade %};{% endif %}
{% endif %}
{% if data.version %}

    VERSION {{ conn|qtIdent(data.version) }}{% if not data.cascade %};{% endif %}
{% endif %}
{% if data.cascade %}

    CASCADE;
{% endif %}
{% endif %}
