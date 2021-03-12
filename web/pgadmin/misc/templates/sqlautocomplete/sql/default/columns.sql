{# SQL query for getting columns #}
{% if object_name == 'table' %}
SELECT  nsp.nspname schema_name,
        cls.relname table_name,
        att.attname column_name,
        att.atttypid::regtype::text type_name,
        att.atthasdef AS has_default,
        pg_get_expr(def.adbin, def.adrelid) as default
FROM    pg_catalog.pg_attribute att
        INNER JOIN pg_catalog.pg_class cls
            ON att.attrelid = cls.oid
        INNER JOIN pg_catalog.pg_namespace nsp
            ON cls.relnamespace = nsp.oid
        LEFT OUTER JOIN pg_catalog.pg_attrdef def
            ON def.adrelid = att.attrelid
            AND def.adnum = att.attnum
WHERE   nsp.nspname IN ({{schema_names}})
        AND cls.relkind = ANY(array['r'])
        AND NOT att.attisdropped
        AND att.attnum  > 0
ORDER BY 1, 2, att.attnum
{% endif %}
{% if object_name == 'view' %}
SELECT  nsp.nspname schema_name,
        cls.relname table_name,
        att.attname column_name,
        att.atttypid::regtype::text type_name,
        att.atthasdef AS has_default,
        pg_get_expr(def.adbin, def.adrelid) as default
FROM    pg_catalog.pg_attribute att
        INNER JOIN pg_catalog.pg_class cls
            ON att.attrelid = cls.oid
        INNER JOIN pg_catalog.pg_namespace nsp
            ON cls.relnamespace = nsp.oid
        LEFT OUTER JOIN pg_catalog.pg_attrdef def
            ON def.adrelid = att.attrelid
            AND def.adnum = att.attnum
WHERE   nsp.nspname IN ({{schema_names}})
        AND cls.relkind = ANY(array['v', 'm'])
        AND NOT att.attisdropped
        AND att.attnum  > 0
ORDER BY 1, 2, att.attnum
{% endif %}
