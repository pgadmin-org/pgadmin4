{#============================Create new view=========================#}
{% if display_comments %}
-- View: {{ data.schema }}.{{ data.name }}

-- DROP VIEW {{ conn|qtIdent(data.schema, data.name) }};

{% endif %}
{% if data.name and data.schema and data.definition %}
CREATE{% if add_replace_clause %} OR REPLACE{% endif %} VIEW {{ conn|qtIdent(data.schema, data.name) }}
{% if ((data.check_option and data.check_option.lower() != 'no') or data.security_barrier or data.security_invoker) %}
WITH (
{% if data.check_option and data.check_option.lower() != 'no' %}
  check_option={{ data.check_option }}{% if data.security_barrier or data.security_invoker %},
{% endif %}{% endif %}
{% if data.security_barrier %}
  security_barrier={{ data.security_barrier|lower }}{% if data.security_invoker %},
{% endif %}{% endif %}
{% if data.security_invoker %}
  security_invoker={{ data.security_invoker|lower }}{% endif %}

){% endif %} AS
{{ data.definition.rstrip(';') }};
{% if data.owner and data.m_view is undefined %}

ALTER TABLE IF EXISTS {{ conn|qtIdent(data.schema, data.name) }}
    OWNER TO {{ conn|qtIdent(data.owner) }};
{% endif %}
{% if data.comment %}
COMMENT ON VIEW {{ conn|qtIdent(data.schema, data.name) }}
    IS {{ data.comment|qtLiteral(conn) }};
{% endif %}
{% endif %}
