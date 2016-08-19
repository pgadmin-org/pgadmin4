{# ============= CREATE LANGUAGE Query ============= #}
{% import 'macros/privilege.macros' as PRIVILEGE %}
{% import 'macros/security.macros' as SECLABEL %}
{% if data.is_template %}
CREATE LANGUAGE {{ conn|qtIdent(data.name) }};
{% else %}
CREATE{% if data.trusted %} TRUSTED{% endif %} PROCEDURAL LANGUAGE {{ conn|qtIdent(data.name) }}
{% if data.lanproc %}
    HANDLER {{ conn|qtIdent(data.lanproc) }}
{% endif %}
{% if data.laninl %}
    INLINE {{ conn|qtIdent(data.laninl) }}
{% endif %}
{% if data.lanval %}
    VALIDATOR {{ conn|qtIdent(data.lanval) }}
{% endif %};
{% endif %}
{# ============= Set the owner for language ============= #}
{% if data.lanowner %}
ALTER LANGUAGE {{ conn|qtIdent(data.name) }}
    OWNER TO {{ conn|qtIdent(data.lanowner) }};
{% endif %}
{# ============= Comment on of language object ============= #}
{% if data.description %}
COMMENT ON LANGUAGE {{ conn|qtIdent(data.name) }}
    IS {{ data.description|qtLiteral }};
{% endif %}
{# ============= Create ACL for language ============= #}
{% if data.lanacl %}
{% for priv in data.lanacl %}
{{ PRIVILEGE.APPLY(conn, 'LANGUAGE', priv.grantee, data.name, priv.without_grant, priv.with_grant) }}
{% endfor %}
{% endif %}
{# ========= Change the security labels ========== #}
{% if data.seclabels %}
{% for r in data.seclabels %}
{{ SECLABEL.APPLY(conn, 'LANGUAGE', data.name, r.provider, r.label) }}
{% endfor %}
{% endif %}
