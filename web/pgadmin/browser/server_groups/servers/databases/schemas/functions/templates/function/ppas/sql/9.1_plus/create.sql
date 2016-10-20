{% import 'macros/functions/security.macros' as SECLABEL %}
{% import 'macros/functions/privilege.macros' as PRIVILEGE %}
{% import 'macros/functions/variable.macros' as VARIABLE %}
{% set is_columns = [] %}
{% if data %}
{% if query_for == 'sql_panel' and func_def is defined %}
CREATE{% if query_type is defined %}{{' OR REPLACE'}}{% endif %} FUNCTION {{func_def}}
{% else %}
CREATE{% if query_type is defined %}{{' OR REPLACE'}}{% endif %} FUNCTION {{ conn|qtIdent(data.pronamespace, data.name) }}({% if data.args %}
{% for p in data.args %}{% if p.argmode %}{{p.argmode}} {% endif %}{% if p.argname %}{{ conn|qtIdent(p.argname)}} {% endif %}{% if p.argtype %}{{ conn|qtTypeIdent(p.argtype) }}{% endif %}{% if p.argdefval %} DEFAULT {{p.argdefval}}{% endif %}
{% if not loop.last %},{% endif %}
{% endfor %}
{% endif -%}
)
{% endif -%}
    RETURNS{% if data.proretset and data.prorettypename.startswith('SETOF ') %} {{ data.prorettypename }} {% elif data.proretset %} SETOF {{ conn|qtTypeIdent(data.prorettypename) }}{% else %} {{ conn|qtTypeIdent(data.prorettypename) }}{% endif %}

    LANGUAGE {{ data.lanname|qtLiteral }}
{% if data.procost %}
    COST {{data.procost}}
{% endif %}
    {% if data.provolatile %}{% if data.provolatile == 'i' %}IMMUTABLE{% elif data.provolatile == 's' %}STABLE{% else %}VOLATILE{% endif %} {% endif %}{% if data.proisstrict %}STRICT {% endif %}{% if data.prosecdef %}SECURITY DEFINER {% endif %}{% if data.proiswindow %}WINDOW{% endif -%}
{% if data.prorows %}
    ROWS {{data.prorows}}{% endif -%}{% if data.variables %}{% for v in data.variables %}

    SET {{ conn|qtIdent(v.name) }}={{ v.value|qtLiteral }}{% endfor %}
{% endif %}

AS {% if data.lanname == 'c' %}
{{ data.probin|qtLiteral }}, {{ data.prosrc_c|qtLiteral }}
{% else %}
$function$
{{ data.prosrc }}
$function${% endif %};
{% if data.funcowner %}

ALTER FUNCTION {{ conn|qtIdent(data.pronamespace, data.name) }}({{data.func_args_without}})
    OWNER TO {{ data.funcowner }};
{% endif %}
{% if data.acl %}
{% for p in data.acl %}

{{ PRIVILEGE.SET(conn, "FUNCTION", p.grantee, data.name, p.without_grant, p.with_grant, data.pronamespace, data.func_args_without)}}
{% endfor %}{% endif %}
{% if data.description %}

COMMENT ON FUNCTION {{ conn|qtIdent(data.pronamespace, data.name) }}({{data.func_args_without}})
    IS {{ data.description|qtLiteral  }};
{% endif -%}
{% if data.seclabels %}
{% for r in data.seclabels %}
{% if r.label and r.provider %}

{{ SECLABEL.SET(conn, 'FUNCTION', data.name, r.provider, r.label, data.pronamespace, data.func_args_without) }}
{% endif %}
{% endfor %}
{% endif -%}

{% endif %}
