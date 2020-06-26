{% import 'macros/functions/security.macros' as SECLABEL %}
{% import 'macros/functions/privilege.macros' as PRIVILEGE %}{% if data %}
{% set name = o_data.name %}
{% if data.name %}
{% if data.name != o_data.name %}
ALTER PROCEDURE {{ conn|qtIdent(o_data.pronamespace, o_data.name) }}{% if o_data.proargtypenames %}({{ o_data.proargtypenames }}){% endif %}

    RENAME TO {{ conn|qtIdent(data.name) }};
{% set name = data.name %}
{% endif %}

{% endif -%}
{% if data.change_func  %}
CREATE OR REPLACE PROCEDURE {{ conn|qtIdent(o_data.pronamespace, name) }}{% if data.arguments %}({% for p in data.arguments %}{% if p.argmode %}{{p.argmode}} {% endif %}{% if p.argname %}{{ conn|qtIdent(p.argname) }} {% endif %}{% if p.argtype %}{{ p.argtype }}{% endif %}{% if p.argdefval %} DEFAULT {{p.argdefval}}{% endif %}
{% if not loop.last %}, {% endif %}
{% endfor %}
)
{% endif %}

AS
{% if data.prosrc %}{{ data.prosrc }}{% else %}{{ o_data.prosrc }}{% endif -%};
{% endif -%}
{% if data.funcowner %}

ALTER PROCEDURE {{ conn|qtIdent(o_data.pronamespace, name) }}{% if o_data.proargtypenames %}({{ o_data.proargtypenames }}){% endif %}
    OWNER TO {{ conn|qtIdent(data.funcowner) }};
{% endif -%}
{# The SQL generated below will change priviledges #}
{% if data.acl %}
{% if 'deleted' in data.acl %}
{% for priv in data.acl.deleted %}

{{ PRIVILEGE.UNSETALL(conn, 'PROCEDURE', priv.grantee, name, o_data.pronamespace, o_data.proargtypenames) }}
{% endfor %}
{% endif -%}
{% if 'changed' in data.datacl %}
{% for priv in data.acl.changed %}

{{ PRIVILEGE.UNSETALL(conn, 'PROCEDURE', priv.grantee, name, o_data.pronamespace, o_data.proargtypenames) }}

{{ PRIVILEGE.SET(conn, 'PROCEDURE', priv.grantee, name, priv.without_grant,
 priv.with_grant, o_data.pronamespace, o_data.proargtypenames) }}
{% endfor %}
{% endif -%}
{% if 'added' in data.acl %}
{% for priv in data.acl.added %}

{{ PRIVILEGE.SET(conn, 'PROCEDURE', priv.grantee, name, priv.without_grant, priv.with_grant, o_data.pronamespace, o_data.proargtypenames) }}
{% endfor %}
{% endif %}
{% endif -%}
{% set seclabels = data.seclabels %}
{% if 'deleted' in seclabels and seclabels.deleted|length > 0 %}
{% for r in seclabels.deleted %}

{{ SECLABEL.UNSET(conn, 'PROCEDURE', name, r.provider, o_data.pronamespace, o_data.proargtypenames) }}
{% endfor %}
{% endif -%}
{% if 'added' in seclabels and seclabels.added|length > 0 %}
{% for r in seclabels.added %}

{{ SECLABEL.SET(conn, 'PROCEDURE', name, r.provider, r.label, o_data.pronamespace, o_data.proargtypenames) }}
{% endfor %}
{% endif -%}
{% if 'changed' in seclabels and seclabels.changed|length > 0 %}
{% for r in seclabels.changed %}

{{ SECLABEL.SET(conn, 'PROCEDURE', name, r.provider, r.label, o_data.pronamespace, o_data.proargtypenames) }}
{% endfor %}
{% endif -%}
{% if data.description is defined and data.description != o_data.description%}

COMMENT ON PROCEDURE {{ conn|qtIdent(o_data.pronamespace, name) }}
    IS {{ data.description|qtLiteral }};
{% endif -%}
{% if data.pronamespace %}

ALTER PROCEDURE {{ conn|qtIdent(o_data.pronamespace, name) }}
    SET SCHEMA {{ conn|qtIdent(data.pronamespace) }};
{% endif -%}

{% endif %}
