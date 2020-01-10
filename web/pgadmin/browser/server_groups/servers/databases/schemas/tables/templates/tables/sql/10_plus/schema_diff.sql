

INSERT INTO {{conn|qtIdent(data.schema, data.name)}}(
{% if data.columns and data.columns|length > 0 %}
{% for c in data.columns %}{{c.name}}{% if not loop.last %},{% endif %}{% endfor %}{% endif %})
SELECT {% if data.columns and data.columns|length > 0 %}{% for c in data.columns %}{{c.name}}{% if not loop.last %},{% endif %}{% endfor %}{% endif %}
 FROM {{conn|qtIdent(data.schema, data.orig_name)}};

DROP TABLE {{conn|qtIdent(data.schema, data.orig_name)}};

{{partition_sql}}

ALTER TABLE {{conn|qtIdent(data.schema, data.name)}}
    RENAME TO {{conn|qtIdent(data.orig_name)}};
