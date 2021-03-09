SELECT
    c.oid, c.relname as name
FROM pg_catalog.pg_class c
{% if scid %}
WHERE relnamespace = {{scid}}::oid
OR  (
    -- On EnterpriseDB we need to ignore some objects in the catalog, namely, _*, dual and type_object_source.
	select 'sys' ~ (SELECT nsp.nspname FROM pg_catalog.pg_namespace nsp WHERE nsp.oid = {{scid}}::oid)
	AND
	(c.relname NOT LIKE '\\_%' AND c.relname = 'dual' AND  c.relname = 'type_object_source')
    )
{% elif coid %}
WHERE c.oid = {{coid}}::oid
{% endif %}
ORDER BY relname;
