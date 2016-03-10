-- Language: {{data.name}}

-- DROP LANGUAGE {{ conn|qtIdent(data.name) }}

{# ============= CREATE LANGUAGE Query ============= #}
CREATE {% if data.trusted %}TRUSTED{% endif %} PROCEDURAL LANGUAGE {{ conn|qtIdent(data.name) }}
{% if data.lanproc %}
  HANDLER {{ conn|qtIdent(data.lanproc) }}
{% endif %}
{% if data.laninl %}
  INLINE {{ conn|qtIdent(data.laninl) }}
{% endif %}
{% if data.lanval %}
  VALIDATOR {{ conn|qtIdent(data.lanval) }}{% endif %};
  
{# ============= ALTER LANGUAGE Query ============= #}
{% if data.lanowner %}
ALTER LANGUAGE {{ conn|qtIdent(data.name) }}
  OWNER TO {{ conn|qtIdent(data.lanowner) }};
{% endif %}