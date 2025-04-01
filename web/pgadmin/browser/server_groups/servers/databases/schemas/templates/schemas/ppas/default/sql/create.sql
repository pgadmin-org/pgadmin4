{% import 'macros/security.macros' as SECLABEL %}
{% import 'macros/privilege.macros' as PRIVILEGE %}
{% import 'macros/default_privilege.macros' as DEFAULT_PRIVILEGE %}
{% if data.name %}
CREATE SCHEMA{% if add_not_exists_clause %} IF NOT EXISTS{% endif %} {{ conn|qtIdent(data.name) }}{% if data.namespaceowner %}

    AUTHORIZATION {{ conn|qtIdent(data.namespaceowner) }}{% endif %}{% endif %};
{#  Alter the comment/description #}
{% if data.description %}

COMMENT ON SCHEMA {{ conn|qtIdent(data.name) }}
    IS {{ data.description|qtLiteral(conn) }};
{% endif %}
{# ACL for the schema #}
{% if data.nspacl %}
{% for priv in data.nspacl %}

{{ PRIVILEGE.APPLY(conn, 'SCHEMA', priv.grantee, data.name, priv.without_grant, priv.with_grant) }}{% endfor %}
{% endif %}
{# Default privileges on tables #}
{% for defacl, type in [
    ('deftblacl', 'TABLES'), ('defseqacl', 'SEQUENCES'),
    ('deffuncacl', 'FUNCTIONS'), ('deftypeacl', 'TYPES')]
%}
{% if data[defacl] %}{% set acl = data[defacl] %}
{% for priv in acl %}

{{ DEFAULT_PRIVILEGE.SET(
    conn, 'SCHEMA', data.name, type, priv.grantee,
    priv.without_grant, priv.with_grant, priv.grantor
    ) }}{% endfor %}
{% endif %}
{% endfor %}
{# Security Labels on schema #}
{% if data.seclabels and data.seclabels|length > 0 %}
{% for r in data.seclabels %}

{{ SECLABEL.APPLY(conn, 'SCHEMA', data.name, r.provider, r.label) }}
{% endfor %}
{% endif %}
