{% import 'macros/security.macros' as SECLABEL %}
{% import 'macros/privilege.macros' as PRIVILEGE %}
{% import 'macros/default_privilege.macros' as DEFAULT_PRIVILEGE %}
{% if data %}
{### To update SCHEMA name ###}
{% if data.name and data.name != o_data.name %}
ALTER SCHEMA {{ conn|qtIdent(o_data.name) }}
    RENAME TO {{ conn|qtIdent(data.name) }};

{% endif %}
{### To update SCHEMA owner ###}
{% if data.namespaceowner and data.namespaceowner != o_data.namespaceowner %}
ALTER SCHEMA {{ conn|qtIdent(data.name) }}
    OWNER TO {{ conn|qtIdent(data.namespaceowner) }};

{% endif %}
{### To update SCHEMA comments ###}
{% if data.description is defined and data.description != o_data.description %}
COMMENT ON SCHEMA {{ conn|qtIdent(data.name) }}
    IS {{ data.description|qtLiteral }};

{% endif %}
{### Change the security labels ###}
{# The SQL generated below will change Security Label #}
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
{### Change the privileges ###}
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
{### To change default privileges for tables ###}
{% if data.deftblacl %}
{% if 'deleted' in data.deftblacl %}
{% for priv in data.deftblacl.deleted %}
{{ DEFAULT_PRIVILEGE.UNSET(conn, 'SCHEMA', data.name, 'TABLES', priv.grantee) }}
{% endfor %}
{% endif %}
{% if 'changed' in data.deftblacl %}
{% for priv in data.deftblacl.changed %}
{% if priv.grantee != priv.old_grantee %}
{{ DEFAULT_PRIVILEGE.UNSET(conn, 'SCHEMA', data.name, 'TABLES', priv.old_grantee) }}
{% else %}
{{ DEFAULT_PRIVILEGE.UNSET(conn, 'SCHEMA', data.name, 'TABLES', priv.grantee) }}
{% endif %}
{{ DEFAULT_PRIVILEGE.SET(conn,'SCHEMA', data.name, 'TABLES', priv.grantee, priv.without_grant, priv.with_grant) }}
{% endfor %}
{% endif %}
{% if 'added' in data.deftblacl %}
{% for priv in data.deftblacl.added %}
{{ DEFAULT_PRIVILEGE.SET(conn,'SCHEMA', data.name, 'TABLES', priv.grantee, priv.without_grant, priv.with_grant) }}
{% endfor %}
{% endif %}

{% endif %}
{### To change default privileges for sequences ###}
{% if data.defseqacl %}
{% if 'deleted' in data.defseqacl %}
{% for priv in data.defseqacl.deleted %}
{{ DEFAULT_PRIVILEGE.UNSET(conn,'SCHEMA', data.name, 'SEQUENCES', priv.grantee) }}
{% endfor %}
{% endif %}
{% if 'changed' in data.defseqacl %}
{% for priv in data.defseqacl.changed %}
{{ DEFAULT_PRIVILEGE.UNSET(conn,'SCHEMA', data.name, 'SEQUENCES', priv.grantee) }}
{{ DEFAULT_PRIVILEGE.SET(conn,'SCHEMA', data.name, 'SEQUENCES', priv.grantee, priv.without_grant, priv.with_grant) }}
{% endfor %}
{% endif %}
{% if 'added' in data.defseqacl %}
{% for priv in data.defseqacl.added %}
{{ DEFAULT_PRIVILEGE.SET(conn,'SCHEMA', data.name, 'SEQUENCES', priv.grantee, priv.without_grant, priv.with_grant) }}
{% endfor %}
{% endif %}

{% endif %}
{### To change default privileges for functions ###}
{% if data.deffuncacl %}
{% if 'deleted' in data.deffuncacl %}
{% for priv in data.deffuncacl.deleted %}
{{ DEFAULT_PRIVILEGE.UNSET(conn,'SCHEMA', data.name, 'FUNCTIONS', priv.grantee) }}
{% endfor %}
{% endif %}
{% if 'changed' in data.deffuncacl %}
{% for priv in data.deffuncacl.changed %}
{{ DEFAULT_PRIVILEGE.UNSET(conn,'SCHEMA', data.name, 'FUNCTIONS', priv.grantee) }}
{{ DEFAULT_PRIVILEGE.SET(conn,'SCHEMA', data.name, 'FUNCTIONS', priv.grantee, priv.without_grant, priv.with_grant) }}
{% endfor %}
{% endif %}
{% if 'added' in data.deffuncacl %}
{% for priv in data.deffuncacl.added %}
{{ DEFAULT_PRIVILEGE.SET(conn,'SCHEMA', data.name, 'FUNCTIONS', priv.grantee, priv.without_grant, priv.with_grant) }}
{% endfor %}
{% endif %}

{% endif %}
{###  End main if data ###}
{% endif %}
