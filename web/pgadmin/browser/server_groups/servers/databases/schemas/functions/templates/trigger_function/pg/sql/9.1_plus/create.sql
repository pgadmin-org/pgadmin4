{% import 'macros/functions/security.macros' as SECLABEL %}
{% import 'macros/functions/privilege.macros' as PRIVILEGE %}
{% import 'macros/functions/variable.macros' as VARIABLE %}
{% set is_columns = [] %}
{% if data %}
CREATE FUNCTION {{ conn|qtIdent(data.pronamespace, data.name) }}()
    RETURNS{% if data.proretset %} SETOF{% endif %} {{ conn|qtTypeIdent(data.prorettypename) }}
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
$BODY$
{{ data.prosrc }}
$BODY${% endif %};
{% if data.funcowner %}

ALTER FUNCTION {{ conn|qtIdent(data.pronamespace, data.name) }}({{data.func_args}})
    OWNER TO {{ data.funcowner }};
{% endif %}
{% if data.acl %}
{% for p in data.acl %}

{{ PRIVILEGE.SET(conn, "FUNCTION", p.grantee, data.name, p.without_grant, p.with_grant, data.pronamespace, data.func_args)}}
{% endfor %}{% endif %}
{% if data.description %}

COMMENT ON FUNCTION {{ conn|qtIdent(data.pronamespace, data.name) }}({{data.func_args}})
    IS {{ data.description|qtLiteral  }};
{% endif -%}
{% if data.seclabels %}
{% for r in data.seclabels %}
{% if r.label and r.provider %}

{{ SECLABEL.SET(conn, 'FUNCTION', data.name, r.provider, r.label, data.pronamespace, data.func_args) }}
{% endif %}
{% endfor %}
{% endif -%}

{% endif %}
