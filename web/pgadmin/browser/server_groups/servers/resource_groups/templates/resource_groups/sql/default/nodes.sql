SELECT oid, rgrpname AS name
FROM edb_resource_group
{% if rgid %}
WHERE oid={{rgid}}::oid
{% endif %}
ORDER BY rgrpname