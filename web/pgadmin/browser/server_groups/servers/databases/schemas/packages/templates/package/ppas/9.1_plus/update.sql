{% import 'macros/schemas/privilege.macros' as PRIVILEGE %}

{% if data %}
{% if data.pkgheadsrc is defined and data.pkgheadsrc != o_data.pkgheadsrc and o_data.pkgbodysrc != None or (data.pkgbodysrc is defined and data.pkgbodysrc == '')  %}
DROP PACKAGE BODY {{ conn|qtIdent(data.schema,data.name) }};
{% endif %}
{% if data.pkgheadsrc %}

CREATE OR REPLACE PACKAGE {{ conn|qtIdent(data.schema,data.name) }}
IS
{{data.pkgheadsrc}}
END {{ conn|qtIdent(data.name) }};

{% if data.pkgbodysrc %}

CREATE OR REPLACE PACKAGE BODY {{ conn|qtIdent(data.schema,data.name) }}
IS
{{data.pkgbodysrc}}
END {{ conn|qtIdent(data.name) }};
{% endif %}
{% if data.pkgacl %}
{% if 'deleted' in data.pkgacl %}
{% for priv in data.pkgacl.deleted %}
{{ PRIVILEGE.UNSETALL(conn, 'PACKAGE', priv.grantee, data.name, data.schema) }}
{% endfor %}
{% endif %}
{% if 'changed' in data.pkgacl %}
{% for priv in data.pkgacl.changed %}
{{ PRIVILEGE.UNSETALL(conn, 'PACKAGE', priv.grantee, data.name, data.schema) }}
{{ PRIVILEGE.SET(conn, 'PACKAGE', priv.grantee, data.name, priv.without_grant, priv.with_grant, data.schema) }}
{% endfor %}
{% endif %}
{% if 'added' in data.pkgacl %}
{% for priv in data.pkgacl.added %}
{{ PRIVILEGE.SET(conn, 'PACKAGE', priv.grantee, data.name, priv.without_grant, priv.with_grant, data.schema) }}
{% endfor %}
{% endif %}
{% endif %}
{% if data.description is defined %}

COMMENT ON PACKAGE {{ conn|qtIdent(data.schema,data.name) }}
    IS {{ data.description|qtLiteral }};
{% endif %}
{% endif %}
