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
	NOREPLICATION{% endif %}{% endif %}{% if 'rolbypassrls' in data %}

{% if data.rolbypassrls %}
	BYPASSRLS{% else %}
	NOBYPASSRLS{% endif %}{% endif %}{% if 'rolconnlimit' in data and data.rolconnlimit is number and data.rolconnlimit >= -1 %}

	CONNECTION LIMIT {{ data.rolconnlimit }}
{% endif %}{% if 'rolvaliduntil' in data %}

	VALID UNTIL {% if data.rolvaliduntil and data.rolvaliduntil is not none %}{{ data.rolvaliduntil|qtLiteral(conn) }}{% else %}'infinity'
{% endif %}{% endif %}{% if 'rolpassword' in data %}

	PASSWORD{% if data.rolpassword is none %} NULL{% else %}{% if dummy %} 'xxxxxx'{% else %} {{ data.rolpassword|qtLiteral(conn) }}{% endif %}{% endif %}{% endif %};{% endif %}

{% if data.rolmembership_revoked_list and data.rolmembership_revoked_list|length > 0 %}
{% for item in data.rolmembership_revoked_list %}

REVOKE {{ conn|qtIdent(item.role) }} FROM {{ conn|qtIdent(rolname) }};
{% endfor %}
{% endif %}
{% if data.rolmembership_list and data.rolmembership_list|length > 0 %}
{% for item in data.rolmembership_list %}

GRANT {{ conn|qtIdent(item.role) }} TO {{ conn|qtIdent(rolname) }}{% if 'admin' in item or 'inherit' in item or 'set' in item %} WITH ADMIN {{ item.admin }}, INHERIT {{ item.inherit }}, SET {{ item.set }}{% endif %};
{% endfor %}
{% endif %}
{% if data.seclabels and
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
{% if data.rol_members_revoked_list and data.rol_members_revoked_list|length > 0 %}
{% for item in data.rol_members_revoked_list %}

REVOKE {{ conn|qtIdent(rolname) }} FROM {{ conn|qtIdent(item.role) }};
{% endfor %}
{% endif %}
{% if data.rol_members_list and data.rol_members_list|length > 0 %}
{% for item in data.rol_members_list %}

GRANT {{ conn|qtIdent(rolname) }} TO {{ conn|qtIdent(item.role) }} {% if 'admin' in item or 'inherit' in item or 'set' in item %} WITH ADMIN {{ item.admin }}, INHERIT {{ item.inherit }}, SET {{ item.set }}{% endif %};
{% endfor %}
{% endif %}
