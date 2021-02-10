{% import 'macros/security.macros' as SECLABEL %}
{% import 'macros/privilege.macros' as PRIVILEGE %}
{% import 'macros/default_privilege.macros' as DEFAULT_PRIVILEGE %}
{# Rename the schema #}
{% if data.name and data.name != o_data.name %}
ALTER SCHEMA {{ conn|qtIdent(o_data.name) }}
    RENAME TO {{ conn|qtIdent(data.name) }};

{% endif %}
{# Change the owner #}
{% if data.namespaceowner and data.namespaceowner != o_data.namespaceowner %}
ALTER SCHEMA {{ conn|qtIdent(data.name) }}
    OWNER TO {{ conn|qtIdent(data.namespaceowner) }};

{% endif %}
{# Update the comments/description #}
{% if data.description is defined and data.description != o_data.description %}
COMMENT ON SCHEMA {{ conn|qtIdent(data.name) }}
    IS {{ data.description|qtLiteral }};

{% endif %}
{# Change the privileges #}
{% if data.nspacl %}
{% if 'deleted' in data.nspacl %}
{% for priv in data.nspacl.deleted %}
{{ PRIVILEGE.RESETALL(conn, 'SCHEMA', priv.grantee, data.name) }}
{% endfor %}
{% endif %}
{% if 'changed' in data.nspacl %}
{% for priv in data.nspacl.changed %}
{% if priv.grantee != priv.old_grantee %}
{{ PRIVILEGE.RESETALL(conn, 'SCHEMA', priv.old_grantee, data.name) }}
{% else %}
{{ PRIVILEGE.RESETALL(conn, 'SCHEMA', priv.grantee, data.name) }}
{% endif %}
{{ PRIVILEGE.APPLY(conn, 'SCHEMA', priv.grantee, data.name, priv.without_grant, priv.with_grant) }}
{% endfor %}
{% endif %}
{% if 'added' in data.nspacl %}
{% for priv in data.nspacl.added %}
{{ PRIVILEGE.APPLY(conn, 'SCHEMA', priv.grantee, data.name, priv.without_grant, priv.with_grant) }}
{% endfor %}
{% endif %}
{% endif %}
{# Change the default privileges #}
{% for defacl, type in [
    ('deftblacl', 'TABLES'), ('defseqacl', 'SEQUENCES'),
    ('deffuncacl', 'FUNCTIONS')]
%}
{% if data[defacl] %}{% set acl = data[defacl] %}
{% if 'deleted' in acl %}
{% for priv in acl.deleted %}
{{ DEFAULT_PRIVILEGE.UNSET(conn, 'SCHEMA', data.name, type, priv.grantee) }}
{% endfor %}
{% endif %}
{% if 'changed' in acl %}
{% for priv in acl.changed %}
{% if priv.grantee != priv.old_grantee %}
{{ DEFAULT_PRIVILEGE.UNSET(conn, 'SCHEMA', data.name, type, priv.old_grantee) }}
{% else %}
{{ DEFAULT_PRIVILEGE.UNSET(conn, 'SCHEMA', data.name, type, priv.grantee) }}
{% endif %}
{{ DEFAULT_PRIVILEGE.SET(conn,'SCHEMA', data.name, type, priv.grantee, priv.without_grant, priv.with_grant) }}
{% endfor %}
{% endif %}
{% if 'added' in acl %}
{% for priv in acl.added %}
{{ DEFAULT_PRIVILEGE.SET(conn,'SCHEMA', data.name, type, priv.grantee, priv.without_grant, priv.with_grant) }}
{% endfor %}
{% endif %}
{% endif %}
{% endfor %}
{# Change the security labels #}
{% if data.seclabels and data.seclabels|length > 0 %}
{% set seclabels = data.seclabels %}
{% if 'deleted' in seclabels and seclabels.deleted|length > 0 %}
{% for r in seclabels.deleted %}
{{ SECLABEL.DROP(conn, 'SCHEMA', data.name, r.provider) }}
{% endfor %}
{% endif %}
{% if 'added' in seclabels and seclabels.added|length > 0 %}
{% for r in seclabels.added %}
{{ SECLABEL.APPLY(conn, 'SCHEMA', data.name, r.provider, r.label) }}
{% endfor %}
{% endif %}
{% if 'changed' in seclabels and seclabels.changed|length > 0 %}
{% for r in seclabels.changed %}
{{ SECLABEL.APPLY(conn, 'SCHEMA', data.name, r.provider, r.label) }}
{% endfor %}
{% endif %}
{% endif %}
