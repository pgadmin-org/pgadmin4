{% import 'macros/privilege.macros' as PRIVILEGE %}
{% import 'macros/security.macros' as SECLABEL %}
-- Language: {{data.name}}

-- DROP LANGUAGE IF EXISTS {{ conn|qtIdent(data.name) }}

{# ============= CREATE LANGUAGE Query ============= #}
CREATE{% if add_replace_clause %} OR REPLACE{% endif %}{% if data.trusted %} TRUSTED{% endif %} PROCEDURAL LANGUAGE {{ conn|qtIdent(data.name) }}
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
{# ============= Comment on LANGUAGE Query ============= #}
{% if data.description %}

COMMENT ON LANGUAGE {{ conn|qtIdent(data.name) }}
    IS {{ data.description|qtLiteral }};
{% endif %}
{# ============= PRIVILEGES on LANGUAGE ============= #}
{% if data.lanacl and data.lanacl|length > 0 %}

{% for priv in data.lanacl %}
{{ PRIVILEGE.APPLY(conn, 'LANGUAGE', priv.grantee, data.name, priv.without_grant, priv.with_grant) }}
{% endfor %}
{% endif %}
{# ============= PRIVILEGES on LANGUAGE ============= #}
{% if data.seclabels and data.seclabels|length > 0 %}

{% for r in data.seclabels %}
{{ SECLABEL.APPLY(conn, 'PROCEDURAL LANGUAGE', data.name, r.provider, r.label) }}
{% endfor %}
{% endif %}
