{% import 'foreign_tables/sql/macros/db_catalogs.macro' as CATALOG %}
typisdefined AND typtype IN ('b', 'c', 'd', 'e', 'r')
AND NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_class
    WHERE relnamespace=typnamespace
        AND relname = typname AND relkind != 'c')
    AND (typname NOT LIKE '_%' OR NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_class
    WHERE relnamespace=typnamespace
        AND relname = substring(typname FROM 2)::name
        AND relkind != 'c'))
{% if not show_system_objects %}
 {{ CATALOG.VALID_TYPE_CATALOGS(server_type) }}
{% endif %}
