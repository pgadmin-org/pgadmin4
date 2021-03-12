{# Insert the new row with primary keys (specified in primary_keys) #}
INSERT INTO {{ conn|qtIdent(nsp_name, object_name) | replace("%", "%%") }} (
{% for col in data_to_be_saved %}
{% if not loop.first %}, {% endif %}{{ conn|qtIdent(col) | replace("%", "%%") }}{% endfor %}
) VALUES (
{% for col in data_to_be_saved %}
{% if not loop.first %}, {% endif %}%({{ pgadmin_alias[col] }})s{% if type_cast_required[col] %}::{{ data_type[col] }}{% endif %}{% endfor %}
)
{% if pk_names and not has_oids %} returning {{pk_names | replace("%", "%%")}}{% endif %}
{% if has_oids %} returning oid{% endif %};
