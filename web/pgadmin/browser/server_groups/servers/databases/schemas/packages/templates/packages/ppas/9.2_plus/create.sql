{% import 'macros/schemas/privilege.macros' as PRIVILEGE %}

{% if data %}
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

{% for priv in data.pkgacl %}
{{ PRIVILEGE.SET(conn, 'PACKAGE', priv.grantee, data.name, priv.without_grant, priv.with_grant, data.schema) }}
{% endfor %}
{% endif %}{% if data.description %}
COMMENT ON PACKAGE {{ conn|qtIdent(data.schema,data.name) }}
    IS {{ data.description|qtLiteral }};
{% endif %}
{% endif %}
