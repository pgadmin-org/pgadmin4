SELECT
    c.oid, c.relname as name
FROM pg_class c
{% if scid %}
WHERE relnamespace = {{scid}}::int
OR  (
    -- On EnterpriseDB we need to ignore some objects in the catalog, namely, _*, dual and type_object_source.
	select 'sys' ~ (SELECT nsp.nspname FROM pg_namespace nsp WHERE nsp.oid = {{scid}}::int)
	AND
	(c.relname NOT LIKE '\\_%' AND c.relname = 'dual' AND  c.relname = 'type_object_source')
    )
{% elif coid %}
WHERE c.oid = {{coid}}::int
{% endif %}
ORDER BY relname;
