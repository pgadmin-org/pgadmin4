{# ===== Fetch list of Database object types(Package) ===== #}
{% if node_id %}
SELECT
	nsp.nspname AS name,
	snsp.nspname AS nspname,
	'Package' as object_type,
	'icon-package' as icon
FROM
	pg_catalog.pg_namespace nsp
LEFT OUTER JOIN pg_catalog.pg_namespace snsp ON (nsp.nspparent = snsp.oid)
WHERE nsp.nspparent = {{ node_id }}::oid
AND nsp.nspobjecttype = 0
AND nsp.nspcompoundtrigger = false
ORDER BY nsp.nspname;
{% endif %}
