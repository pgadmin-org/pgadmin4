{% import 'macros/privilege.macros' as PRIVILEGE %}
{% if data %}
{# ============= Update foreign data wrapper name ============= #}
{% if data.name != o_data.name %}
ALTER FOREIGN DATA WRAPPER {{ conn|qtIdent(o_data.name) }}
    RENAME TO {{ conn|qtIdent(data.name) }};

{% endif %}
{# ============= Update foreign data wrapper owner ============= #}
{% if data.fdwowner and data.fdwowner != o_data.fdwowner %}
ALTER FOREIGN DATA WRAPPER {{ conn|qtIdent(data.name) }}
    OWNER TO {{ conn|qtIdent(data.fdwowner) }};

{% endif %}
{# ============= Update foreign data wrapper validator ============= #}
{% if data.fdwvalue and data.fdwvalue != o_data.fdwvalue %}
ALTER FOREIGN DATA WRAPPER {{ conn|qtIdent(data.name) }}
    VALIDATOR {{ data.fdwvalue }};

{% endif %}
{% if data.fdwvalue == '' and data.fdwvalue != o_data.fdwvalue %}
ALTER FOREIGN DATA WRAPPER {{ conn|qtIdent(data.name) }}
    NO VALIDATOR;

{% endif %}
{# ============= Update foreign data wrapper handler ============= #}
{% if data.fdwhan and data.fdwhan != o_data.fdwhan %}
ALTER FOREIGN DATA WRAPPER {{ conn|qtIdent(data.name) }}
    HANDLER {{ data.fdwhan }};

{% endif %}
{% if data.fdwhan == '' and data.fdwhan != o_data.fdwhan %}
ALTER FOREIGN DATA WRAPPER {{ conn|qtIdent(data.name) }}
    NO HANDLER;

{% endif %}
{# ============= Update foreign data wrapper comments ============= #}
{% if data.description is defined and data.description != o_data.description %}
COMMENT ON FOREIGN DATA WRAPPER {{ conn|qtIdent(data.name) }}
    IS {{ data.description|qtLiteral }};

{% endif %}
{# ============= Update foreign data wrapper options and values ============= #}
{% if data.fdwoptions and data.fdwoptions.deleted %}
{% set addAlter = "False" %}
{% for variable in data.fdwoptions.deleted %}
{% if variable.fdwoption and variable.fdwoption != '' %}
{% if addAlter == "False" %}
ALTER FOREIGN DATA WRAPPER {{ conn|qtIdent(data.name) }}
    OPTIONS ({% set addAlter = "True" %}{%endif%}
DROP {{ conn|qtIdent(variable.fdwoption) }}{% if not loop.last %},{% else %});{% endif %}
{% endif %}
{% endfor %}


{% endif %}
{% if data.fdwoptions and data.fdwoptions.added %}
{% set addAlter = "False" %}
{% for variable in data.fdwoptions.added %}
{% if variable.fdwoption and variable.fdwoption != '' %}
{% if addAlter == "False" %}
ALTER FOREIGN DATA WRAPPER {{ conn|qtIdent(data.name) }}
    OPTIONS ({% set addAlter = "True" %}{% endif %}
ADD {{ conn|qtIdent(variable.fdwoption) }} {{variable.fdwvalue|qtLiteral}}{% if not loop.last %},{% else %});{% endif %}
{% endif %}
{%endfor%}


{% endif %}
{% if data.fdwoptions and data.fdwoptions.changed %}
{% set addAlter = "False" %}
{% for variable in data.fdwoptions.changed %}
{% if variable.fdwoption and variable.fdwoption != '' %}
{% if addAlter == "False" %}
ALTER FOREIGN DATA WRAPPER {{ conn|qtIdent(data.name) }}
    OPTIONS ({% set addAlter = "True" %}{% endif %}
SET {{ conn|qtIdent(variable.fdwoption) }} {{variable.fdwvalue|qtLiteral}}{% if not loop.last %},{% else %});{% endif %}
{% endif %}
{%endfor%}


{% endif %}
{# Change the privileges #}
{% if data.fdwacl %}
{% if 'deleted' in data.fdwacl %}
{% for priv in data.fdwacl.deleted %}
{{ PRIVILEGE.RESETALL(conn, 'FOREIGN DATA WRAPPER', priv.grantee, data.name) }} {% endfor %}
{% endif %}
{% if 'changed' in data.fdwacl %}
{% for priv in data.fdwacl.changed %}
{{ PRIVILEGE.RESETALL(conn, 'FOREIGN DATA WRAPPER', priv.grantee, data.name) }}
{{ PRIVILEGE.APPLY(conn, 'FOREIGN DATA WRAPPER', priv.grantee, data.name, priv.without_grant, priv.with_grant) }} {% endfor %}
{% endif %}
{% if 'added' in data.fdwacl %}
{% for priv in data.fdwacl.added %}
{{ PRIVILEGE.APPLY(conn, 'FOREIGN DATA WRAPPER', priv.grantee, data.name, priv.without_grant, priv.with_grant) }}{% endfor %}
{% endif %}
{% endif %}
{% endif %}
