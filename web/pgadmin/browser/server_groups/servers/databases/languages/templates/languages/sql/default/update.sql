{% import 'macros/privilege.macros' as PRIVILEGE %}
{% import 'macros/security.macros' as SECLABEL %}
{% if data %}
{# ============= Check for Schema Diff Tool ============= #}
{% if (data.trusted and data.trusted != o_data.trusted) or (data.lanproc and data.lanproc != o_data.lanproc) or (data.laninl and data.laninl != o_data.laninl) or (data.lanval and data.lanval != o_data.lanval) %}
-- WARNING:
-- We have found the difference in either of TRUSTED, HANDLER, INLINE or VALIDATOR,
-- so we need to drop the existing language first and re-create it.
DROP LANGUAGE {{ conn|qtIdent(o_data.name) }} CASCADE;

{% if data.trusted is defined %}{% set tmp_trusted = data.trusted %}{% else %}{% set tmp_trusted = o_data.trusted %}{% endif %}
{% if data.lanproc is defined %}{% set tmp_lanproc = data.lanproc %}{% else %}{% set tmp_lanproc = o_data.lanproc %}{% endif %}
{% if data.laninl is defined %}{% set tmp_laninl = data.laninl %}{% else %}{% set tmp_laninl = o_data.laninl %}{% endif %}
{% if data.lanval is defined %}{% set tmp_lanval = data.lanval %}{% else %}{% set tmp_lanval = o_data.lanval %}{% endif %}
CREATE{% if tmp_trusted %} TRUSTED{% endif %} PROCEDURAL LANGUAGE {{ conn|qtIdent(o_data.name) }}
{% if tmp_lanproc %}
    HANDLER {{ conn|qtIdent(tmp_lanproc) }}
{% endif %}
{% if tmp_laninl %}
    INLINE {{ conn|qtIdent(tmp_laninl) }}
{% endif %}
{% if tmp_lanval %}
    VALIDATOR {{ conn|qtIdent(tmp_lanval) }}
{% endif %};

ALTER LANGUAGE {{ conn|qtIdent(o_data.name) }}
    OWNER TO {{ conn|qtIdent(o_data.lanowner) }};
{% endif %}
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
