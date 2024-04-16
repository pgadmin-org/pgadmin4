{% import 'macros/functions/security.macros' as SECLABEL %}
{% import 'macros/functions/privilege.macros' as PRIVILEGE %}
{% import 'macros/functions/variable.macros' as VARIABLE %}{% if data %}
{% set name = o_data.name %}
{% set exclude_quoting = ['search_path'] %}
{% set set_variables = [] %}
{% if 'merged_variables' in data and data.merged_variables|length > 0 %}
{% set set_variables = data.merged_variables %}
{% elif 'variables' in o_data and o_data.variables|length > 0 %}
{% set set_variables = o_data.variables %}
{% endif %}
{% if data.name %}
{% if data.name != o_data.name %}
ALTER FUNCTION {{ conn|qtIdent(o_data.pronamespace, o_data.name) }}({{
o_data.proargtypenames }})
    RENAME TO {{ conn|qtIdent(data.name) }};
{% set name = data.name %}
{% endif %}
{% endif -%}
{% if data.change_func  %}

CREATE OR REPLACE FUNCTION {{ conn|qtIdent(o_data.pronamespace, name) }}({% if data.arguments %}
{% for p in data.arguments %}{% if p.argmode %}{{p.argmode}} {% endif %}{% if p.argname %}{{ conn|qtIdent(p.argname) }} {% endif %}{% if p.argtype %}{{ p.argtype }}{% endif %}{% if p.argdefval %} DEFAULT {{p.argdefval}}{% endif %}
{% if not loop.last %},{% endif %}
{% endfor %}
{% endif -%}
)
    RETURNS {% if 'prorettypename' in data %}{{ data.prorettypename }}{% else %}{{ o_data.prorettypename }}{% endif %}

{% if 'lanname' in data %}
    LANGUAGE {{ data.lanname|qtLiteral(conn) }} {% else %}
    LANGUAGE {{ o_data.lanname|qtLiteral(conn) }}
    {% endif %}{% if 'provolatile' in data and data.provolatile %}{{ data.provolatile }} {% elif 'provolatile' not in data and o_data.provolatile %}{{ o_data.provolatile }}{% endif %}
{% if ('proleakproof' in data and data.proleakproof) or ('proleakproof' not in data and o_data.proleakproof) %} LEAKPROOF{% elif 'proleakproof' in data and not data.proleakproof %} NOT LEAKPROOF{% endif %}
{% if ('proisstrict' in data and data.proisstrict) or ('proisstrict' not in data and o_data.proisstrict) %} STRICT{% endif %}
{% if ('prosecdef' in data and data.prosecdef) or ('prosecdef' not in data and o_data.prosecdef) %} SECURITY DEFINER{% endif %}
{% if ('proiswindow' in data and data.proiswindow) or ('proiswindow' not in data and o_data.proiswindow) %} WINDOW{% endif %}

    {% if 'proparallel' in data and data.proparallel %}PARALLEL {{ data.proparallel }}{% elif 'proparallel' not in data and o_data.proparallel %}PARALLEL {{ o_data.proparallel }}{% endif %}

    {% if data.procost %}COST {{data.procost}}{% elif o_data.procost %}COST {{o_data.procost}}{% endif %}{% if data.prorows and data.prorows != '0' %}

    ROWS {{data.prorows}}{% elif data.prorows is not defined and o_data.prorows and o_data.prorows != '0' %}    ROWS {{o_data.prorows}} {%endif -%}{% if set_variables and set_variables|length > 0 %}{% for v in set_variables %}

    SET {{ conn|qtIdent(v.name) }}={% if v.name in exclude_quoting %}{{ v.value }}{% else %}{{ v.value|qtLiteral(conn) }}{% endif %}{% endfor -%}
    {% endif %}

AS {% if (data.lanname == 'c' or o_data.lanname == 'c') and ('probin' in data or 'prosrc_c' in data) %}
{% if 'probin' in data %}{{ data.probin|qtLiteral(conn) }}{% else %}{{ o_data.probin|qtLiteral(conn) }}{% endif %}, {% if 'prosrc_c' in data %}{{ data.prosrc_c|qtLiteral(conn) }}{% else %}{{ o_data.prosrc_c|qtLiteral(conn) }}{% endif %}{% elif 'prosrc' in data %}
$BODY${{ data.prosrc }}$BODY${% elif o_data.lanname == 'c' %}
{{ o_data.probin|qtLiteral(conn) }}, {{ o_data.prosrc_c|qtLiteral(conn) }}{% else %}
$BODY${{ o_data.prosrc }}$BODY${% endif -%};
{% endif -%}
{% if data.funcowner %}

ALTER FUNCTION {{ conn|qtIdent(o_data.pronamespace, name) }}({{o_data.proargtypenames }})
    OWNER TO {{ conn|qtIdent(data.funcowner) }};
{% endif -%}
{# The SQL generated below will change priviledges #}
{% if data.acl %}
{% if 'deleted' in data.acl %}
{% for priv in data.acl.deleted %}

{{ PRIVILEGE.UNSETALL(conn, 'FUNCTION', priv.grantee, name, o_data.pronamespace, o_data.proargtypenames) }}
{% endfor %}
{% endif -%}
{% if 'changed' in data.acl %}
{% for priv in data.acl.changed %}

{% if priv.grantee != priv.old_grantee %}
{{ PRIVILEGE.UNSETALL(conn, 'FUNCTION', priv.old_grantee, name, o_data.pronamespace, o_data.proargtypenames) }}
{% else %}
{{ PRIVILEGE.UNSETALL(conn, 'FUNCTION', priv.grantee, name, o_data.pronamespace, o_data.proargtypenames) }}
{% endif %}

{{ PRIVILEGE.SET(conn, 'FUNCTION', priv.grantee, name, priv.without_grant, priv.with_grant, o_data.pronamespace, o_data.proargtypenames) }}
{% endfor %}
{% endif -%}
{% if 'added' in data.acl %}
{% for priv in data.acl.added %}

{{ PRIVILEGE.SET(conn, 'FUNCTION', priv.grantee, name, priv.without_grant, priv.with_grant, o_data.pronamespace, o_data.proargtypenames) }}
{% endfor %}{% endif -%}
{% endif -%}
{% if data.change_func == False %}
{% if data.variables %}
{% if 'deleted' in data.variables and data.variables.deleted|length > 0 %}

{{ VARIABLE.UNSET(conn, 'FUNCTION', name, data.variables.deleted, o_data.pronamespace, o_data.proargtypenames) }}
{% endif -%}
{% if 'merged_variables' in data and data.merged_variables|length > 0 %}

{{ VARIABLE.SET(conn, 'FUNCTION', name, data.merged_variables, o_data.pronamespace, o_data.proargtypenames) }}
{% endif -%}
{% endif -%}
{% endif -%}
{% set seclabels = data.seclabels %}
{% if 'deleted' in seclabels and seclabels.deleted|length > 0 %}
{% for r in seclabels.deleted %}

{{ SECLABEL.UNSET(conn, 'FUNCTION', name, r.provider, o_data.pronamespace, o_data.proargtypenames) }}
{% endfor %}
{% endif -%}
{% if 'added' in seclabels and seclabels.added|length > 0 %}
{% for r in seclabels.added %}

{{ SECLABEL.SET(conn, 'FUNCTION', name, r.provider, r.label, o_data.pronamespace, o_data.proargtypenames) }}
{% endfor %}
{% endif -%}
{% if 'changed' in seclabels and seclabels.changed|length > 0 %}
{% for r in seclabels.changed %}

{{ SECLABEL.SET(conn, 'FUNCTION', name, r.provider, r.label, o_data.pronamespace, o_data.proargtypenames) }}
{% endfor %}
{% endif -%}
{% if data.description is defined and data.description != o_data.description%}

COMMENT ON FUNCTION {{ conn|qtIdent(o_data.pronamespace, name) }}({{o_data.proargtypenames }})
    IS {{ data.description|qtLiteral(conn) }};
{% endif -%}

{% if data.pronamespace %}

ALTER FUNCTION {{ conn|qtIdent(o_data.pronamespace, name) }}({{o_data.proargtypenames }})
    SET SCHEMA {{ conn|qtIdent(data.pronamespace) }};
{% endif -%}

{% endif %}
