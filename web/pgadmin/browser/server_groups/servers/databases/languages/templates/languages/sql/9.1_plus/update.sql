{% import 'macros/privilege.macros' as PRIVILEGE %}
{% import 'macros/security.macros' as SECLABEL %}
{% if data %}
{# ============= Update language name ============= #}
{% if data.name != o_data.name %}
ALTER LANGUAGE {{ conn|qtIdent(o_data.name) }}
    RENAME TO {{ conn|qtIdent(data.name) }};
{% endif %}
{# ============= Update language user ============= #}
{% if data.lanowner and data.lanowner != o_data.lanowner %}
ALTER LANGUAGE {{ conn|qtIdent(data.name) }}
    OWNER TO {{ conn|qtIdent(data.lanowner) }};
{% endif %}
{# ============= Update language comments ============= #}
{% if data.description is defined and data.description != o_data.description %}
COMMENT ON LANGUAGE {{ conn|qtIdent(data.name) }}
    IS '{{ data.description }}';
{% endif %}
{% endif %}

{# Change the privileges #}
{% if data.lanacl %}
{% if 'deleted' in data.lanacl %}
{% for priv in data.lanacl.deleted %}
{{ PRIVILEGE.RESETALL(conn, 'LANGUAGE', priv.grantee, data.name) }}
{% endfor %}
{% endif %}
{% if 'changed' in data.lanacl %}
{% for priv in data.lanacl.changed %}
{{ PRIVILEGE.RESETALL(conn, 'LANGUAGE', priv.grantee, data.name) }}
{{ PRIVILEGE.APPLY(conn, 'LANGUAGE', priv.grantee, data.name, priv.without_grant, priv.with_grant) }}
{% endfor %}
{% endif %}
{% if 'added' in data.lanacl %}
{% for priv in data.lanacl.added %}
{{ PRIVILEGE.APPLY(conn, 'LANGUAGE', priv.grantee, data.name, priv.without_grant, priv.with_grant) }}
{% endfor %}
{% endif %}
{% endif %}

{% if data.seclabels and
	data.seclabels|length > 0
%}{% set seclabels = data.seclabels %}
{% if 'deleted' in seclabels and seclabels.deleted|length > 0 %}

{% for r in seclabels.deleted %}
{{ SECLABEL.DROP(conn, 'PROCEDURAL LANGUAGE', data.name, r.provider) }}
{% endfor %}
{% endif %}
{% if 'added' in seclabels and seclabels.added|length > 0 %}

{% for r in seclabels.added %}
{{ SECLABEL.APPLY(conn, 'PROCEDURAL LANGUAGE', data.name, r.provider, r.label) }}
{% endfor %}
{% endif %}
{% if 'changed' in seclabels and seclabels.changed|length > 0 %}

{% for r in seclabels.changed %}
{{ SECLABEL.APPLY(conn, 'PROCEDURAL LANGUAGE', data.name, r.provider, r.label) }}
{% endfor %}
{% endif %}
{% endif %}