{% import 'macros/functions/security.macros' as SECLABEL %}
{% import 'macros/functions/privilege.macros' as PRIVILEGE %}
{% import 'macros/functions/variable.macros' as VARIABLE %}
{% set is_columns = [] %}
{% set exclude_quoting = ['search_path'] %}
{% if data %}
{% if query_for == 'sql_panel' and func_def is defined %}
CREATE{% if query_type is defined %}{{' OR REPLACE'}}{% endif %} FUNCTION {{func_def}}
{% else %}
CREATE{% if query_type is defined %}{{' OR REPLACE'}}{% endif %} FUNCTION {{ conn|qtIdent(data.pronamespace, data.name) }}({% if data.arguments %}
{% for p in data.arguments %}{% if p.argmode %}{{p.argmode}} {% endif %}{% if p.argname %}{{ conn|qtIdent(p.argname) }} {% endif %}{% if p.argtype %}{{ p.argtype }}{% endif %}{% if p.argdefval %} DEFAULT {{p.argdefval}}{% endif %}
{% if not loop.last %}, {% endif %}
{% endfor %}
{% endif -%}
)
{% endif %}
    RETURNS{% if data.proretset and (data.prorettypename.startswith('SETOF ') or data.prorettypename.startswith('TABLE')) %} {{ data.prorettypename }} {% elif data.proretset %} SETOF {{ data.prorettypename }}{% else %} {{ data.prorettypename }}{% endif %}

    LANGUAGE {{ data.lanname|qtLiteral(conn) }}
{% if data.procost %}
    COST {{data.procost}}
{% endif %}
    {% if data.provolatile %}{% if data.provolatile == 'i' %}IMMUTABLE{% elif data.provolatile == 's' %}STABLE{% else %}VOLATILE{% endif %} {% endif %}{% if data.proleakproof %}LEAKPROOF {% endif %}
{% if data.proisstrict %}STRICT {% endif %}
{% if data.prosecdef %}SECURITY DEFINER {% endif %}
{% if data.proiswindow %}WINDOW {% endif %}
{% if data.proparallel and (data.proparallel == 'r' or data.proparallel == 's' or data.proparallel == 'u') %}
{% if data.proparallel == 'r' %}PARALLEL RESTRICTED {% elif data.proparallel == 's' %}PARALLEL SAFE {% elif data.proparallel == 'u' %}PARALLEL UNSAFE{% endif %}{% endif %}
{% if data.prorows and (data.prorows | int) > 0 %}

    ROWS {{data.prorows}}
{% endif %}
{% if data.prosupportfunc %}

    SUPPORT {{ data.prosupportfunc }}
{% endif -%}
{% if data.variables %}{% for v in data.variables %}

    SET {{ conn|qtIdent(v.name) }}={% if v.name in exclude_quoting %}{{ v.value }}{% else %}{{ v.value|qtLiteral(conn) }}{% endif %}{% endfor %}
{% endif %}

AS {% if data.lanname == 'c' %}
{{ data.probin|qtLiteral(conn) }}, {{ data.prosrc_c|qtLiteral(conn) }}
{% else %}
$BODY${{ data.prosrc }}$BODY${% endif -%};
{% if data.funcowner %}

ALTER FUNCTION {{ conn|qtIdent(data.pronamespace, data.name) }}({{data.func_args_without}})
    OWNER TO {{ conn|qtIdent(data.funcowner) }};
{% endif -%}

{% if data.dependsonextensions %}
{% for ext in data.dependsonextensions %}

ALTER FUNCTION {{ conn|qtIdent(data.pronamespace, data.name) }}({{data.func_args_without}})
    DEPENDS ON EXTENSION {{ conn|qtIdent(ext) }};
{% endfor %}
{% endif %}

{% if data.acl %}
{% for p in data.acl %}

{{ PRIVILEGE.SET(conn, "FUNCTION", p.grantee, data.name, p.without_grant, p.with_grant, data.pronamespace, data.func_args_without)}}
{% endfor %}{% endif %}
{% if data.revoke_all %}

{{ PRIVILEGE.UNSETALL(conn, "FUNCTION", "PUBLIC", data.name, data.pronamespace, data.func_args_without)}}
{% endif %}
{% if data.description %}

COMMENT ON FUNCTION {{ conn|qtIdent(data.pronamespace, data.name) }}({{data.func_args_without}})
    IS {{ data.description|qtLiteral(conn)  }};
{% endif -%}
{% if data.seclabels %}
{% for r in data.seclabels %}
{% if r.label and r.provider %}

{{ SECLABEL.SET(conn, 'FUNCTION', data.name, r.provider, r.label, data.pronamespace, data.func_args_without) }}
{% endif %}
{% endfor %}
{% endif -%}

{% endif %}
