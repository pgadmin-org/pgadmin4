{# Select table rows #}
SELECT {% if has_oids %}oid, {% endif %}* FROM {{ conn|qtIdent(nsp_name, object_name) }}
WHERE
{% if has_oids %}
  oid = %(oid)s
{% elif primary_keys|length > 0 %}
  {% for pk in primary_keys %}
    {% if not loop.first %} AND {% endif %}{{ conn|qtIdent(pk) }} = %({{ pk }})s{% endfor %}
{% endif %};
