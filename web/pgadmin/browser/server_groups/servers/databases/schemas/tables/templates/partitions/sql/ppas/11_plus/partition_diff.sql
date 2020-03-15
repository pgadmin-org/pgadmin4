CREATE TABLE {{conn|qtIdent(data.schema, data.name)}} (
    LIKE {{conn|qtIdent(data.schema, data.orig_name)}} INCLUDING ALL
) PARTITION BY {{ data.partition_scheme }};
{{partition_sql}}{{partition_data.default_partition_header}}
CREATE TABLE IF NOT EXISTS {{conn|qtIdent(data.schema, data.default_partition_name)}} PARTITION OF {{conn|qtIdent(data.schema, data.name)}} DEFAULT;

INSERT INTO {{conn|qtIdent(data.schema, data.name)}}(
{% if data.columns and data.columns|length > 0 %}
{% for c in data.columns %} {{c.name}}{% if not loop.last %},{% endif %}{% endfor %}{% endif %})
SELECT {% if data.columns and data.columns|length > 0 %}{% for c in data.columns %}{{c.name}}{% if not loop.last %},{% endif %}{% endfor %}{% endif %}
 FROM {{conn|qtIdent(data.schema, data.orig_name)}};

{% if partition_data.partitions and partition_data.partitions|length > 0 %}
{% for part in partition_data.partitions %}
DROP TABLE IF EXISTS {{conn|qtIdent(data.schema, part.partition_name)}};

ALTER TABLE {{conn|qtIdent(data.schema, part.temp_partition_name)}}
    RENAME TO {{conn|qtIdent(part.partition_name)}};

{% endfor %}{% endif %}
DROP TABLE {{conn|qtIdent(data.schema, data.orig_name)}};

ALTER TABLE {{conn|qtIdent(data.schema, data.name)}}
    RENAME TO {{data.orig_name}};
