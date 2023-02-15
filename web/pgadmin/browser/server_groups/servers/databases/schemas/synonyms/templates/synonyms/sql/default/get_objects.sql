{###########################################}
{### If Target Type is Function ###}
{###########################################}
{% if trgTyp == 'f' %}
SELECT DISTINCT proname AS name
    FROM pg_catalog.pg_proc p, pg_catalog.pg_namespace n
WHERE p.pronamespace = n.oid AND
    n.nspname = {{  trgSchema|qtLiteral(conn) }} AND
    p.protype  = '0'
ORDER BY proname;
{###########################################}
{### If Target Type is Procedure ###}
{###########################################}
{% elif trgTyp == 'p' %}
SELECT DISTINCT proname AS name
    FROM pg_catalog.pg_proc p, pg_catalog.pg_namespace n
WHERE p.pronamespace = n.oid AND
    n.nspname = {{  trgSchema|qtLiteral(conn) }} AND
    p.protype  = '1'
ORDER BY proname;
{###########################################}
{### If Target Type is Synonym ###}
{###########################################}
{% elif trgTyp == 's' %}
SELECT synname AS name
    FROM pg_catalog.pg_synonym
ORDER BY synname;
{###########################################}
{### If Target Type is Package ###}
{###########################################}
{% elif trgTyp == 'P' %}
SELECT nspname AS name
    FROM pg_catalog.pg_namespace
WHERE nspparent IN (
                    SELECT oid
                        FROM pg_catalog.pg_namespace
                    WHERE nspname = {{ trgSchema|qtLiteral(conn) }} LIMIT 1
                   )
      AND nspobjecttype = 0
ORDER BY nspname;
{% else %}
{###################################################}
{### If Target Type is Table/View/M.View/Sequnce ###}
{###################################################}
SELECT relname AS name
    FROM pg_catalog.pg_class c, pg_catalog.pg_namespace n
WHERE c.relnamespace = n.oid AND
    n.nspname = {{  trgSchema|qtLiteral(conn) }} AND
{% if trgTyp == 'v' %}
{# If view is select then we need to fetch both view and materialized view #}
 (c.relkind = 'v' OR c.relkind = 'm')
{% else %}
    c.relkind = {{ trgTyp|qtLiteral(conn) }}
{% endif %}
ORDER BY relname;
{% endif %}
