{% import 'macros/security.macros' as SECLABEL %}
{% import 'macros/variable.macros' as VARIABLE %}
CREATE ROLE {{ conn|qtIdent(data.rolname) }} WITH{% if data.rolcanlogin and data.rolcanlogin is sameas True  %}

	LOGIN{% else %}

	NOLOGIN{% endif %}{% if data.rolsuper %}

	SUPERUSER{% else %}

	NOSUPERUSER{% endif %}{% if data.rolcreatedb %}

	CREATEDB{% else %}

	NOCREATEDB{% endif %}{% if data.rolcreaterole %}

	CREATEROLE{% else %}

	NOCREATEROLE{% endif %}{% if data.rolinherit is sameas true %}

	INHERIT{% else %}

	NOINHERIT{% endif %}{% if data.rolreplication %}

	REPLICATION{% else %}

	NOREPLICATION{% endif %}{% if data.rolbypassrls %}

	BYPASSRLS{% else %}

	NOBYPASSRLS{% endif %}{% if 'rolconnlimit' in data and data.rolconnlimit is number and data.rolconnlimit >= -1 %}

	CONNECTION LIMIT {{ data.rolconnlimit }}{% endif %}{% if data.rolvaliduntil and data.rolvaliduntil is not none %}

	VALID UNTIL {{ data.rolvaliduntil|qtLiteral(conn) }} {% endif %}{% if data.rolpassword %}

	PASSWORD {% if data.rolpassword is none %}NULL{% else %}{% if dummy %}'xxxxxx'{% else %} {{ data.rolpassword|qtLiteral(conn) }}{% endif %}{% endif %}{% endif %};
{% if data.rolmembership_list and data.rolmembership_list|length > 0 %}
{% for item in data.rolmembership_list %}

GRANT {{ conn|qtIdent(item.role) }} TO {{ conn|qtIdent(data.rolname) }}{% if 'admin' in item or 'inherit' in item or 'set' in item %} WITH ADMIN {{ item.admin }}, INHERIT {{ item.inherit }}, SET {{ item.set }}{% endif %};
{% endfor %}
{% endif %}
{% if data.seclabels and data.seclabels|length > 0 %}
{% for r in data.seclabels %}

{{ SECLABEL.APPLY(conn, 'ROLE', data.rolname, r.provider, r.label) }}
{% endfor %}{% endif %}{% if data.variables %}

{% for var in data.variables %}

{{ VARIABLE.APPLY(conn, var.database, data.rolname, var.name, var.value) }}
{% endfor %}{% endif %}{% if data.description %}

COMMENT ON ROLE {{ conn|qtIdent(data.rolname) }} IS {{ data.description|qtLiteral(conn) }};
{% endif %}
{% if data.rol_members_list and data.rol_members_list|length > 0 %}
{% for item in data.rol_members_list %}

GRANT {{ conn|qtIdent(data.rolname) }} TO {{ conn|qtIdent(item.role) }}{% if 'admin' in item or 'inherit' in item or 'set' in item %} WITH ADMIN {{ item.admin }}, INHERIT {{ item.inherit }}, SET {{ item.set }}{% endif %};
{% endfor %}
{% endif %}
