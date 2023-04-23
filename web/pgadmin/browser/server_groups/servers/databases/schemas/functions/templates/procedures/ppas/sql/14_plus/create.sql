{% import 'macros/functions/security.macros' as SECLABEL %}
{% import 'macros/functions/privilege.macros' as PRIVILEGE %}
{% import 'macros/functions/variable.macros' as VARIABLE %}
{% set is_columns = [] %}
{% set exclude_quoting = ['search_path'] %}
{% if data %}
{% if query_for == 'sql_panel' and func_def is defined %}
CREATE OR REPLACE PROCEDURE {{func_def}}
{% else %}
CREATE{% if add_replace_clause %} OR REPLACE{% endif %} PROCEDURE {{ conn|qtIdent(data.pronamespace, data.name) }}{% if data.arguments is defined %}
({% for p in data.arguments %}{% if p.argmode %}{{p.argmode}} {% endif %}{% if p.argname %}{{ conn|qtIdent(p.argname)}} {% endif %}{% if p.argtype %}{{ p.argtype }}{% endif %}{% if p.argdefval %} DEFAULT {{p.argdefval}}{% endif %}
{% if not loop.last %}, {% endif %}
{% endfor -%}
{% endif %}
)
{% endif %}
LANGUAGE {{ data.lanname|qtLiteral(conn) }}{% if data.prosecdef %}

    SECURITY DEFINER {% endif %}
{% if data.lanname == 'edbspl' %}
{% if data.provolatile %}{% if data.provolatile == 'i' %}IMMUTABLE{% elif data.provolatile == 's' %}STABLE{% else %}VOLATILE{% endif %} {% endif %}{% if data.proleakproof %}LEAKPROOF {% endif %}
{% if data.proisstrict %}STRICT {% endif %}
{% if data.proparallel and (data.proparallel == 'r' or data.proparallel == 's' or data.proparallel == 'u') %}
{% if data.proparallel == 'r' %}PARALLEL RESTRICTED{% elif data.proparallel == 's' %}PARALLEL SAFE{% elif data.proparallel == 'u' %}PARALLEL UNSAFE{% endif %} {% endif %}{% if data.procost %}

    COST {{data.procost}}{% endif %}{% if data.prorows and (data.prorows | int) > 0 %}

    ROWS {{data.prorows}}{% endif -%}{% endif %}{% if data.variables %}{% for v in data.variables %}

    SET {{ conn|qtIdent(v.name) }}={% if v.name in exclude_quoting %}{{ v.value }}{% else %}{{ v.value|qtLiteral(conn) }}{% endif %}{% endfor -%}
{% endif %}

{% if data.is_pure_sql %}{{ data.prosrc }}
{% else %}
AS {% if data.lanname == 'c' %}
{{ data.probin|qtLiteral(conn) }}, {{ data.prosrc_c|qtLiteral(conn) }}
{% else %}
$BODY${{ data.prosrc }}$BODY${% endif -%};
{% endif -%}

{% if data.funcowner %}
ALTER PROCEDURE {{ conn|qtIdent(data.pronamespace, data.name) }}({{data.func_args_without}})
    OWNER TO {{ conn|qtIdent(data.funcowner) }};
{% endif -%}

{% if data.acl and not is_sql %}
{% for p in data.acl %}

{{ PRIVILEGE.SET(conn, "PROCEDURE", p.grantee, data.name, p.without_grant, p.with_grant, data.pronamespace, data.func_args_without)}}
{% endfor %}{% endif %}
{% if data.revoke_all %}

{{ PRIVILEGE.UNSETALL(conn, "PROCEDURE", "PUBLIC", data.name, data.pronamespace, data.func_args_without)}}
{% endif %}
{% if data.description %}

COMMENT ON PROCEDURE {{ conn|qtIdent(data.pronamespace, data.name) }}({{data.func_args_without}})
    IS {{ data.description|qtLiteral(conn)  }};
{% endif -%}
{% if data.seclabels %}
{% for r in data.seclabels %}
{% if r.label and r.provider %}

{{ SECLABEL.SET(conn, 'PROCEDURE', data.name, r.provider, r.label, data.pronamespace, data.func_args_without) }}
{% endif %}
{% endfor %}
{% endif -%}

{% endif %}
