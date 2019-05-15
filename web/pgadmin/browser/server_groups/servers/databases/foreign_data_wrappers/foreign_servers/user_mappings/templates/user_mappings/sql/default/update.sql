{# ============= Update user mapping options and values ============= #}
{% if data.umoptions and data.umoptions.deleted and data.umoptions.deleted|length > 0 and fdwdata %}
ALTER USER MAPPING FOR {{ conn|qtIdent(o_data.name) }} SERVER {{ conn|qtIdent(fdwdata.name) }}
    OPTIONS ({% for variable in data.umoptions.deleted %}{% if loop.index != 1 %}, {% endif %}
DROP {{ conn|qtIdent(variable.umoption) }}{% endfor %}
);

{% endif %}
{% if data.umoptions and data.umoptions.added %}
{% if is_valid_added_options %}
ALTER USER MAPPING FOR {{ conn|qtIdent(o_data.name) }} SERVER {{ conn|qtIdent(fdwdata.name) }}
    OPTIONS ({% for variable in data.umoptions.added %}{% if loop.index != 1 %}, {% endif %}
ADD {{ conn|qtIdent(variable.umoption) }} {{ variable.umvalue|qtLiteral }}{% endfor %}
);

{% endif %}
{% endif %}
{% if data.umoptions and data.umoptions.changed %}
{% if is_valid_changed_options %}
ALTER USER MAPPING FOR {{ conn|qtIdent(o_data.name) }} SERVER {{ conn|qtIdent(fdwdata.name) }}
    OPTIONS ({% for variable in data.umoptions.changed %}{% if loop.index != 1 %}, {% endif %}
SET {{ conn|qtIdent(variable.umoption) }} {{ variable.umvalue|qtLiteral }}{% endfor %}
);

{% endif %}
{% endif %}