CREATE TABLE IF NOT EXISTS {{conn|qtIdent(data.schema, data.name)}} (
    LIKE {{conn|qtIdent(data.schema, data.orig_name)}} INCLUDING ALL
) PARTITION BY {{ data.partition_scheme }};
{{partition_sql}}{% if data.create_scaffolding_default_partition %}{{partition_data.default_partition_header}}
CREATE TABLE IF NOT EXISTS {{conn|qtIdent(data.schema, data.default_partition_name)}} PARTITION OF {{conn|qtIdent(data.schema, data.name)}} DEFAULT;
{% endif %}
INSERT INTO {{conn|qtIdent(data.schema, data.name)}}(
{% if data.columns and data.columns|length > 0 %}
{% for c in data.columns %} {{c.name}}{% if not loop.last %},{% endif %}{% endfor %}{% endif %})
SELECT {% if data.columns and data.columns|length > 0 %}{% for c in data.columns %}{{c.name}}{% if not loop.last %},{% endif %}{% endfor %}{% endif %}
 FROM {{conn|qtIdent(data.schema, data.orig_name)}};
{% if data.create_scaffolding_default_partition %}
-- The source table has no default partition of its own, so the
-- scaffolding default partition created above (purely to stop the row
-- copy above failing on unmatched rows) is dropped, but only if it is
-- still empty. If any rows were routed into it (i.e. rows that don't
-- fall within the bounds of any other partition), it is left in place
-- so that data is not lost; it becomes the default partition of the
-- rebuilt table.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM {{conn|qtIdent(data.schema, data.default_partition_name)}}
    ) THEN
        DROP TABLE {{conn|qtIdent(data.schema, data.default_partition_name)}};
    END IF;
END;
$$;
{% endif %}
{% if partition_data.partitions and partition_data.partitions|length > 0 %}
{% for part in partition_data.partitions %}
DROP TABLE IF EXISTS {{conn|qtIdent(data.schema, part.partition_name)}};

ALTER TABLE IF EXISTS {{conn|qtIdent(data.schema, part.temp_partition_name)}}
    RENAME TO {{conn|qtIdent(part.partition_name)}};

{% endfor %}{% endif %}
DROP TABLE IF EXISTS {{conn|qtIdent(data.schema, data.orig_name)}};

ALTER TABLE IF EXISTS {{conn|qtIdent(data.schema, data.name)}}
    RENAME TO {{data.orig_name}};
