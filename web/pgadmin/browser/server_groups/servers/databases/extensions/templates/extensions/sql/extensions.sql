{# ======================Fetch extensions names=====================#}
SELECT
    a.name, a.installed_version,
    pg_catalog.array_agg(av.version) as version,
    pg_catalog.array_agg(av.schema) as schema,
    pg_catalog.array_agg(av.superuser) as superuser,
    pg_catalog.array_agg(av.relocatable) as relocatable
FROM
    pg_catalog.pg_available_extensions a
    LEFT JOIN pg_catalog.pg_available_extension_versions av ON (a.name = av.name)
GROUP BY a.name, a.installed_version
ORDER BY a.name
