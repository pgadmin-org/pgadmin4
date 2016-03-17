{# ============= Update user mapping options and values ============= #}
{% if data.umoptions and data.umoptions.deleted and fdwdata %}
{% set addAlter = "False" %}
{% for variable in data.umoptions.deleted %}
{% if variable.umoption and variable.umoption != '' %}
{% if addAlter == "False" %}
ALTER USER MAPPING FOR {{ conn|qtIdent(o_data.name) }} SERVER {{ conn|qtIdent(fdwdata.name) }}
    OPTIONS ({% set addAlter = "True" %}{%endif%}
DROP {{conn|qtIdent(variable.umoption)}}{% if not loop.last %},{% else %});{% endif %}
{% endif %}
{% endfor %}

{% endif %}
{% if o_data.name and data.umoptions and data.umoptions.added and fdwdata %}
{% set addAlter = "False" %}
{% for variable in data.umoptions.added %}
{% if variable.umoption and variable.umoption != '' %}
{% if addAlter == "False" %}
ALTER USER MAPPING FOR {{ conn|qtIdent(o_data.name) }} SERVER {{ conn|qtIdent(fdwdata.name) }}
    OPTIONS ({% set addAlter = "True" %}{% endif %}
ADD {{ conn|qtIdent(variable.umoption) }} {{variable.umvalue|qtLiteral}}{% if not loop.last %},{% else %});{% endif %}
{% endif %}
{% endfor %}

{% endif %}
{% if data.umoptions and data.umoptions.changed and fdwdata %}
{% set addAlter = "False" %}
{% for variable in data.umoptions.changed %}
{% if variable.umoption and variable.umoption != '' %}
{% if addAlter == "False" %}
ALTER USER MAPPING FOR {{ conn|qtIdent(o_data.name) }} SERVER {{ conn|qtIdent(fdwdata.name) }}
    OPTIONS ({% set addAlter = "True" %}{%endif%}
SET {{conn|qtIdent(variable.umoption)}} {{variable.umvalue|qtLiteral}}{% if not loop.last %},{% else %});{% endif %}
{%endif%}
{% endfor %}

{% endif %}
