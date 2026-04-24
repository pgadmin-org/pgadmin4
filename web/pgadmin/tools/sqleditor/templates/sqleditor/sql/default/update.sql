{# Update the row with primary keys (specified in primary_keys) #}
UPDATE {{ conn|qtIdent(nsp_name, object_name) | replace("%", "%%") }} SET
{% for col in data_to_be_saved %}
{% if not loop.first %}, {% endif %}{{ conn|qtIdent(col) | replace("%", "%%") }} = %({{ pgadmin_alias[col] }})s{% if type_cast_required[col] %}::{{ data_type[col] }}{% endif %}{% endfor %}
 WHERE
{% for pk in primary_keys %}
{% if not loop.first %} AND {% endif %}{{ conn|qtIdent(pk) | replace("%", "%%") }} = {{ primary_keys[pk]|qtLiteral(conn) }}{% endfor %}
{# Return primary keys to refetch row with recalculated generated column values #}
{% if pk_names and not has_oids %} RETURNING {{pk_names | replace("%", "%%")}}{% endif %}
{% if has_oids %} RETURNING oid{% endif %};
