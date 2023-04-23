{% import 'macros/security.macros' as SECLABEL %}
{% import 'macros/variable.macros' as VARIABLE %}
{% if 'rolname' in data %}
{% set rolname=data.rolname %}
ALTER ROLE {{ conn|qtIdent(role) }}
	RENAME TO {{ conn|qtIdent(rolname) }};

{% else %}
{% set rolname=role %}
{% endif %}
{% if data|hasAny(alterKeys) %}
ALTER ROLE {{ conn|qtIdent(rolname) }}{% if 'rolcanlogin' in data %}

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

	VALID UNTIL {% if data.rolvaliduntil %}{{ data.rolvaliduntil|qtLiteral(conn) }}{% else %}'infinity'
{% endif %}{% endif %}{% if 'rolpassword' in data %}

	PASSWORD{% if data.rolpassword is none %} NULL{% else %}{% if dummy %} 'xxxxxx'{% else %} {{ data.rolpassword|qtLiteral(conn) }}{% endif %}{% endif %}{% endif %};{% endif %}

{% if 'revoked_admins' in data and
	data.revoked_admins|length > 0
%}

REVOKE ADMIN OPTION FOR {{ conn|qtIdent(data.revoked_admins)|join(', ') }} FROM {{ conn|qtIdent(rolname) }};{% endif %}{% if 'revoked' in data and data.revoked|length > 0 %}

REVOKE {{ conn|qtIdent(data.revoked)|join(', ') }} FROM {{ conn|qtIdent(rolname) }};{% endif %}{% if data.admins and data.admins|length > 0 %}

GRANT {{ conn|qtIdent(data.admins)|join(', ') }} TO {{ conn|qtIdent(rolname) }} WITH ADMIN OPTION;{% endif %}{% if data.members and data.members|length > 0 %}

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


COMMENT ON ROLE {{ conn|qtIdent(rolname) }} IS {{ data.description|qtLiteral(conn) }};
{% endif %}

{% if 'rol_revoked_admins' in data and
	data.rol_revoked_admins|length > 0
%}

REVOKE ADMIN OPTION FOR {{ conn|qtIdent(rolname) }} FROM {{ conn|qtIdent(data.rol_revoked_admins)|join(', ') }};{% endif %}{% if 'rol_revoked' in data and data.rol_revoked|length > 0 %}

REVOKE {{ conn|qtIdent(rolname) }} FROM {{ conn|qtIdent(data.rol_revoked)|join(', ') }};{% endif %}{% if data.rol_admins and data.rol_admins|length > 0 %}

GRANT {{ conn|qtIdent(rolname) }} TO {{ conn|qtIdent(data.rol_admins)|join(', ') }} WITH ADMIN OPTION;{% endif %}{% if data.rol_members and data.rol_members|length > 0 %}

GRANT {{ conn|qtIdent(rolname) }} TO {{ conn|qtIdent(data.rol_members)|join(', ') }};{% endif %}
