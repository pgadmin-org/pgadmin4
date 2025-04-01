{# SQL query for getting foreign keys #}
SELECT s_p.nspname AS parentschema,
   t_p.relname AS parenttable,
   pg_catalog.unnest((
    select
        pg_catalog.array_agg(attname ORDER BY i)
    from
        (select pg_catalog.unnest(confkey) as attnum, pg_catalog.generate_subscripts(confkey, 1) as i) x
        JOIN pg_catalog.pg_attribute c USING(attnum)
        WHERE c.attrelid = fk.confrelid
    )) AS parentcolumn,
   s_c.nspname AS childschema,
   t_c.relname AS childtable,
   pg_catalog.unnest((
    select
        pg_catalog.array_agg(attname ORDER BY i)
    from
        (select pg_catalog.unnest(conkey) as attnum, pg_catalog.generate_subscripts(conkey, 1) as i) x
        JOIN pg_catalog.pg_attribute c USING(attnum)
        WHERE c.attrelid = fk.conrelid
    )) AS childcolumn
FROM pg_catalog.pg_constraint fk
JOIN pg_catalog.pg_class      t_p ON t_p.oid = fk.confrelid
JOIN pg_catalog.pg_namespace  s_p ON s_p.oid = t_p.relnamespace
JOIN pg_catalog.pg_class      t_c ON t_c.oid = fk.conrelid
JOIN pg_catalog.pg_namespace  s_c ON s_c.oid = t_c.relnamespace
WHERE fk.contype = 'f' AND s_p.nspname IN ({{schema_names}})
