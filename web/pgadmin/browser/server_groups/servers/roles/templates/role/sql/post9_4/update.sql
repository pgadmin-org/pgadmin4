{% import 'macros/security.macros' as SECLABEL %}
{% import 'macros/variable.macros' as VARIABLE %}
{% if 'rolname' in data %}
{% set rolname=data.rolname %}
ALTER{% if rolCanLogin %} USER {% else %} ROLE {% endif %}{{ conn|qtIdent(role) }}
	RENAME TO {{ conn|qtIdent(rolname) }};

{% else %}
{% set rolname=role %}
{% endif %}
{% if data|hasAny(alterKeys) %}
ALTER {% if rolCanLogin %}USER{% else %}ROLE{% endif %} {{ conn|qtIdent(rolname) }}{% if 'rolcanlogin' in data %}

{% if data.rolcanlogin %}
	LOGIN{% else %}
	NOLOGIN{% endif %}{% endif %}{% if 'rolsuper' in data %}

{% if data.rolsuper %}
	SUPERUSER{% else %}
	NOSUPERUSER{% endif %}{% endif %}{% if 'rolcreatedb' in data %}

{% if data.rolcreatedb %}
	CREATEDB{% else %}
	NOCREATEDB{% endif %}{% endif %}{% if 'rolcreaterole' in data %}

{% if data.rolcreaterole %}
	CREATEROLE{% else %}
	NOCREATEROLE{% endif %}{% endif %}{% if 'rolinherit' in data %}

{% if data.rolinherit %}
	INHERIT{% else %}
	NOINHERIT{% endif %}{% endif %}{% if 'rolreplication' in data %}

{% if data.rolreplication %}
	REPLICATION{% else %}
	NOREPLICATION{% endif %}{% endif %}{% if 'rolconnlimit' in data and data.rolconnlimit is number and data.rolconnlimit >= -1 %}

	CONNECTION LIMIT {{ data.rolconnlimit }}
{% endif %}{% if 'rolvaliduntil' in data %}

	VALID UNTIL {% if data.rolvaliduntil %}{{ data.rolvaliduntil|qtLiteral }}{% else %}'infinity'
{% endif %}{% endif %}{% if 'rolpassword' in data %}

	PASSWORD{% if data.rolpassword is none %} NULL{% else %}{% if dummy %} 'xxxxxx'{% else %} {{ data.rolpassword|qtLiteral }}{% endif %}{% endif %}{% endif %};{% endif %}

{% if 'revoked_admins' in data and
	data.revoked_admins|length > 0
%}

-- Revoked the admin options from the members
REVOKE ADMIN OPTION FOR {{ conn|qtIdent(data.revoked_admins)|join(', ') }} FROM {{ conn|qtIdent(rolname) }};{% endif %}{% if 'revoked' in data and data.revoked|length > 0 %}


-- Following are no more the members
REVOKE {{ conn|qtIdent(data.revoked)|join(', ') }} FROM {{ conn|qtIdent(rolname) }};{% endif %}{% if data.admins and data.admins|length > 0 %}

-- Following are the new admins (or, existing members made admins)
GRANT {{ conn|qtIdent(data.admins)|join(', ') }} TO {{ conn|qtIdent(rolname) }} WITH ADMIN OPTION;{% endif %}{% if data.members and data.members|length > 0 %}


-- Following are the new members
GRANT {{ conn|qtIdent(data.members)|join(', ') }} TO {{ conn|qtIdent(rolname) }};{% endif %}{% if data.seclabels and
	data.seclabels|length > 0
%}{% set seclabels = data.seclabels %}
{% if 'deleted' in seclabels and seclabels.deleted|length > 0 %}

{% for r in seclabels.deleted %}
{{ SECLABEL.DROP(conn, 'ROLE', rolname, r.provider) }}
{% endfor %}
{% endif %}
{% if 'added' in seclabels and seclabels.added|length > 0 %}

{% for r in seclabels.added %}
{{ SECLABEL.APPLY(conn, 'ROLE', rolname, r.provider, r.label) }}
{% endfor %}
{% endif %}
{% if 'changed' in seclabels and seclabels.changed|length > 0 %}

{% for r in seclabels.changed %}
{{ SECLABEL.APPLY(conn, 'ROLE', rolname, r.provider, r.label) }}
{% endfor %}
{% endif %}
{% endif %}
{% if 'variables' in data and data.variables|length > 0 %}
{% set variables = data.variables %}
{% if 'deleted' in variables and variables.deleted|length > 0 %}

{% for var in variables.deleted %}
{{ VARIABLE.RESET(conn, var.database, rolname, var.name) }}
{% endfor %}{% endif %}
{% if 'added' in variables and variables.added|length > 0 %}

{% for var in variables.added %}
{{ VARIABLE.APPLY(conn, var.database, rolname, var.name, var.value) }}
{% endfor %}{% endif %}
{% if 'changed' in variables and variables.changed|length > 0 %}

{% for var in variables.changed %}
{{ VARIABLE.APPLY(conn, var.database, rolname, var.name, var.value) }}
{% endfor %}
{% endif %}
{% endif %}
{% if 'description' in data %}


COMMENT ON ROLE {{ conn|qtIdent(rolname) }} IS {{ data.description|qtLiteral }};
{% endif %}
