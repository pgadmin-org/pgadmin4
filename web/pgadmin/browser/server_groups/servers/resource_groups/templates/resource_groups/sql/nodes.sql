SELECT oid, rgrpname AS name
FROM edb_resource_group
{% if rgid %}
WHERE oid={{rgid}}::int
{% endif %}
ORDER BY rgrpname