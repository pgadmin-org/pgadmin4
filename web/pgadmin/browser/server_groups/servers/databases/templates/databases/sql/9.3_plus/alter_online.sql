{% import 'macros/security.macros' as SECLABEL %}
{% import 'macros/variable.macros' as VARIABLE %}
{% import 'macros/privilege.macros' as PRIVILEGE %}
{% import 'macros/default_privilege.macros' as DEFAULT_PRIVILEGE %}
{% if data %}
{# Change the security labels #}
{% if data.seclabels and data.seclabels|length > 0 %}
{% set seclabels = data.seclabels %}
{% if 'deleted' in seclabels and seclabels.deleted|length > 0 %}
{% for r in seclabels.deleted %}
{{ SECLABEL.DROP(conn, 'DATABASE', data.name, r.provider) }}
{% endfor %}
{% endif %}
{% if 'added' in seclabels and seclabels.added|length > 0 %}
{% for r in seclabels.added %}
{{ SECLABEL.APPLY(conn, 'DATABASE', data.name, r.provider, r.label) }}
{% endfor %}
{% endif %}
{% if 'changed' in seclabels and seclabels.changed|length > 0 %}
{% for r in seclabels.changed %}
{{ SECLABEL.APPLY(conn, 'DATABASE', data.name, r.provider, r.label) }}
{% endfor %}
{% endif %}
{% endif %}
{# Change the variables/options #}
{% if data.variables and data.variables|length > 0 %}
{% set variables = data.variables %}
{% if 'deleted' in variables and variables.deleted|length > 0 %}
{% for var in variables.deleted %}
{{ VARIABLE.RESET(conn, data.name, var.role, var.name) }}
{% endfor %}
{% endif %}
{% if 'added' in variables and variables.added|length > 0 %}
{% for var in variables.added %}
{% if var.value == True %}
{{ VARIABLE.APPLY(conn, data.name, var.role, var.name, 'on') }}
{% elif  var.value == False %}
{{ VARIABLE.APPLY(conn, data.name, var.role, var.name, 'off') }}
{% else %}
{{ VARIABLE.APPLY(conn, data.name, var.role, var.name, var.value) }}
{% endif %}
{% endfor %}
{% endif %}
{% if 'changed' in variables and variables.changed|length > 0 %}
{% for var in variables.changed %}
{% if var.value == True %}
{{ VARIABLE.APPLY(conn, data.name, var.role, var.name, 'on') }}
{% elif  var.value == False %}
{{ VARIABLE.APPLY(conn, data.name, var.role, var.name, 'off') }}
{% else %}
{{ VARIABLE.APPLY(conn, data.name, var.role, var.name, var.value) }}
{% endif %}
{% endfor %}
{% endif %}
{% endif %}

{# Change the priviledges/ACLs #}
{% if data.datacl %}
{% if 'deleted' in data.datacl %}
{% for priv in data.datacl.deleted %}
{{ PRIVILEGE.RESETALL(conn, 'DATABASE', priv.grantee, data.name) }}
{% endfor %}
{% endif %}
{% if 'changed' in data.datacl %}
{% for priv in data.datacl.changed %}
{{ PRIVILEGE.RESETALL(conn, 'DATABASE', priv.grantee, data.name) }}
{{ PRIVILEGE.APPLY(conn, 'DATABASE', priv.grantee, data.name, priv.without_grant, priv.with_grant) }}
{% endfor %}
{% endif %}
{% if 'added' in data.datacl %}
{% for priv in data.datacl.added %}
{{ PRIVILEGE.APPLY(conn, 'DATABASE', priv.grantee, data.name, priv.without_grant, priv.with_grant) }}
{% endfor %}
{% endif %}
{% endif %}

{# Change the default priviledges/ACLs for tables #}
{% if data.deftblacl %}
{% if 'deleted' in data.deftblacl %}
{% for priv in data.deftblacl.deleted %}
{{ DEFAULT_PRIVILEGE.RESETALL(conn, 'TABLES', priv.grantee) }}
{% endfor %}
{% endif %}
{% if 'changed' in data.deftblacl %}
{% for priv in data.deftblacl.changed %}
{{ DEFAULT_PRIVILEGE.RESETALL(conn, 'TABLES', priv.grantee) }}
{{ DEFAULT_PRIVILEGE.APPLY(conn, 'TABLES', priv.grantee, priv.without_grant, priv.with_grant) }}
{% endfor %}
{% endif %}
{% if 'added' in data.deftblacl %}
{% for priv in data.deftblacl.added %}
{{ DEFAULT_PRIVILEGE.APPLY(conn, 'TABLES', priv.grantee, priv.without_grant, priv.with_grant) }}
{% endfor %}
{% endif %}
{% endif %}

{# Change the default priviledges/ACLs for sequences #}
{% if data.defseqacl %}
{% if 'deleted' in data.defseqacl %}
{% for priv in data.defseqacl.deleted %}
{{ DEFAULT_PRIVILEGE.RESETALL(conn, 'SEQUENCES', priv.grantee) }}
{% endfor %}
{% endif %}
{% if 'changed' in data.defseqacl %}
{% for priv in data.defseqacl.changed %}
{{ DEFAULT_PRIVILEGE.RESETALL(conn, 'SEQUENCES', priv.grantee) }}
{{ DEFAULT_PRIVILEGE.APPLY(conn, 'SEQUENCES', priv.grantee, priv.without_grant, priv.with_grant) }}
{% endfor %}
{% endif %}
{% if 'added' in data.defseqacl %}
{% for priv in data.defseqacl.added %}
{{ DEFAULT_PRIVILEGE.APPLY(conn, 'SEQUENCES', priv.grantee, priv.without_grant, priv.with_grant) }}
{% endfor %}
{% endif %}
{% endif %}

{# Change the default priviledges/ACLs for functions #}
{% if data.deffuncacl %}
{% if 'deleted' in data.deffuncacl %}
{% for priv in data.deffuncacl.deleted %}
{{ DEFAULT_PRIVILEGE.RESETALL(conn, 'FUNCTIONS', priv.grantee) }}
{% endfor %}
{% endif %}
{% if 'changed' in data.deffuncacl %}
{% for priv in data.deffuncacl.changed %}
{{ DEFAULT_PRIVILEGE.RESETALL(conn, 'FUNCTIONS', priv.grantee) }}
{{ DEFAULT_PRIVILEGE.APPLY(conn, 'FUNCTIONS', priv.grantee, priv.without_grant, priv.with_grant) }}
{% endfor %}
{% endif %}
{% if 'added' in data.deffuncacl %}
{% for priv in data.deffuncacl.added %}
{{ DEFAULT_PRIVILEGE.APPLY(conn, 'FUNCTIONS', priv.grantee, priv.without_grant, priv.with_grant) }}
{% endfor %}
{% endif %}
{% endif %}

{# Change the default priviledges/ACLs for types #}
{% if data.deftypeacl %}
{% if 'deleted' in data.deftypeacl %}
{% for priv in data.deftypeacl.deleted %}
{{ DEFAULT_PRIVILEGE.RESETALL(conn, 'TYPES', priv.grantee) }}
{% endfor %}
{% endif %}
{% if 'changed' in data.deftypeacl %}
{% for priv in data.deftypeacl.changed %}
{{ DEFAULT_PRIVILEGE.RESETALL(conn, 'TYPES', priv.grantee) }}
{{ DEFAULT_PRIVILEGE.APPLY(conn, 'TYPES', priv.grantee, priv.without_grant, priv.with_grant) }}
{% endfor %}
{% endif %}
{% if 'added' in data.deftypeacl %}
{% for priv in data.deftypeacl.added %}
{{ DEFAULT_PRIVILEGE.APPLY(conn, 'TYPES', priv.grantee, priv.without_grant, priv.with_grant) }}
{% endfor %}
{% endif %}
{% endif %}

{% endif %}
