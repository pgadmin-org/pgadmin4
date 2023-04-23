{# ============= Create of user mapping for server ============= #}
{% if data and fdwdata %}
CREATE USER MAPPING FOR {% if data.name == "CURRENT_USER" or data.name == "PUBLIC" %}{{ data.name }}{% else %}{{ conn|qtIdent(data.name) }}{% endif %} SERVER {{ conn|qtIdent(fdwdata.name) }}{%endif%}{% if data.umoptions %}{% if is_valid_options %}

    OPTIONS ({% for variable in data.umoptions %}{% if loop.index != 1 %}, {% endif %}
{{ conn|qtIdent(variable.umoption) }} {{ variable.umvalue|qtLiteral(conn) }}{% endfor %}){% endif %}{% endif %};
