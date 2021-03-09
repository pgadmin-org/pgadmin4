{### Additional where condition for get_types route for column node ###}
typisdefined AND typtype IN ('b', 'c', 'd', 'e', 'r')
AND NOT EXISTS (SELECT 1 FROM pg_catalog.pg_class WHERE relnamespace=typnamespace
AND relname = typname AND relkind != 'c') AND
(typname NOT LIKE '_%' OR NOT EXISTS (SELECT 1 FROM pg_catalog.pg_class WHERE
relnamespace=typnamespace AND relname = substring(typname FROM 2)::name
AND relkind != 'c'))
{% if not show_system_objects %}
AND nsp.nspname != 'information_schema'
{% endif %}
