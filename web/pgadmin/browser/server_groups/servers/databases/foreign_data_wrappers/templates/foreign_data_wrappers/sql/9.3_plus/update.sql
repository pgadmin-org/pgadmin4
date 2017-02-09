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
{% if data.fdwoptions and data.fdwoptions.deleted and data.fdwoptions.deleted|length > 0 %}
ALTER FOREIGN DATA WRAPPER {{ conn|qtIdent(data.name) }}
    OPTIONS ({% for variable in data.fdwoptions.deleted %}{% if loop.index != 1 %}, {% endif %}
DROP {{ conn|qtIdent(variable.fdwoption) }}{% endfor %}
);

{% endif %}
{% if data.fdwoptions and data.fdwoptions.added %}
{% if is_valid_added_options %}
ALTER FOREIGN DATA WRAPPER {{ conn|qtIdent(data.name) }}
    OPTIONS ({% for variable in data.fdwoptions.added %}{% if loop.index != 1 %}, {% endif %}
ADD {{ conn|qtIdent(variable.fdwoption) }} {{ variable.fdwvalue|qtLiteral }}{% endfor %}
);

{% endif %}
{% endif %}
{% if data.fdwoptions and data.fdwoptions.changed %}
{% if is_valid_changed_options %}
ALTER FOREIGN DATA WRAPPER {{ conn|qtIdent(data.name) }}
    OPTIONS ({% for variable in data.fdwoptions.changed %}{% if loop.index != 1 %}, {% endif %}
SET {{ conn|qtIdent(variable.fdwoption) }} {{ variable.fdwvalue|qtLiteral }}{% endfor %}
);

{% endif %}
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
