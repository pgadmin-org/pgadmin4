{# ============= Create of user mapping for server ============= #}
{% if data and fdwdata %}
CREATE USER MAPPING FOR {% if data.name == "CURRENT_USER" or data.name == "PUBLIC" %}{{ data.name }}{% else %}{{ conn|qtIdent(data.name) }}{% endif %} SERVER {{ conn|qtIdent(fdwdata.name) }}{%endif%}{% if data.umoptions %}

{% set addAlter = "False" %}
{% for variable in data.umoptions %}
{% if variable.umoption and variable.umoption != '' %}
{% if addAlter == "False" %}
    OPTIONS ({% set addAlter = "True" %}{% endif %}
{{ conn|qtIdent(variable.umoption) }} {{variable.umvalue|qtLiteral}}{% if not loop.last %},{%else%}){% endif %}
{% endif %}
{% endfor %}
{% endif %}{% if data %};{% endif %}