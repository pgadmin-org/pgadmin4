{# Select table rows #}
SELECT {% if has_oids %}oid, {% endif %}* FROM {{ conn|qtIdent(nsp_name, object_name) }}
WHERE
{% if has_oids %}
  oid = %(oid)s
{% elif pk_names %}
  {% for pk in pk_names %}
    {% if not loop.first %} AND {% endif %}{{ conn|qtIdent(pk) }} = %({{ pk }})s{% endfor %}
{% endif %};
