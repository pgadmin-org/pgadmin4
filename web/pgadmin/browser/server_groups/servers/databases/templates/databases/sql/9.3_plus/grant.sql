{#
# CREATE DATABASE does not allow us to run any
# other sql statements along with it, so we wrote
# separate sql for rest alter sql statements here
#}
{% import 'macros/security.macros' as SECLABEL %}
{% import 'macros/variable.macros' as VARIABLE %}
{% import 'macros/privilege.macros' as PRIVILEGE %}
{% import 'macros/default_privilege.macros' as DEFAULT_PRIVILEGE %}
{% if data.comments %}
COMMENT ON DATABASE {{ conn|qtIdent(data.name) }}
    IS {{ data.comments|qtLiteral }};
{% endif %}

{# Change the security labels #}
{% if data.seclabels %}
{% for r in data.seclabels %}
{{ SECLABEL.APPLY(conn, 'DATABASE', data.name, r.provider, r.label) }}
{% endfor %}
{% endif %}
{# Variables/options #}
{% if data.variables %}
{% for var in data.variables %}
{% if var.value == True %}
{{ VARIABLE.APPLY(conn, data.name, var.role, var.name, 'on') }}
{% elif  var.value == False %}
{{ VARIABLE.APPLY(conn, data.name, var.role, var.name, 'off') }}
{% else %}
{{ VARIABLE.APPLY(conn, data.name, var.role, var.name, var.value) }}
{% endif %}
{% endfor %}
{% endif %}

{# Privileges/ACLs #}
{% if data.datacl %}
{% for priv in data.datacl %}
{{ PRIVILEGE.APPLY(conn, 'DATABASE', priv.grantee, data.name, priv.without_grant, priv.with_grant) }}
{% endfor %}
{% endif %}

{# Default privileges/ACLs for tables #}
{% if data.deftblacl %}
{% for priv in data.deftblacl %}
{{ DEFAULT_PRIVILEGE.APPLY(conn, 'TABLES', priv.grantee, priv.without_grant, priv.with_grant) }}
{% endfor %}
{% endif %}
{# Default privileges/ACLs for sequences #}
{% if data.defseqacl %}
{% for priv in data.defseqacl %}
{{ DEFAULT_PRIVILEGE.APPLY(conn, 'SEQUENCES', priv.grantee, priv.without_grant, priv.with_grant) }}
{% endfor %}
{% endif %}
{# Default privileges/ACLs for functions #}
{% if data.deffuncacl %}
{% for priv in data.deffuncacl %}
{{ DEFAULT_PRIVILEGE.APPLY(conn, 'FUNCTIONS', priv.grantee, priv.without_grant, priv.with_grant) }}
{% endfor %}
{% endif %}
{# Default privileges/ACLs for types #}
{% if data.deftypeacl %}
{% for priv in data.deftypeacl %}
{{ DEFAULT_PRIVILEGE.APPLY(conn, 'TYPES', priv.grantee, priv.without_grant, priv.with_grant) }}
{% endfor %}
{% endif %}
