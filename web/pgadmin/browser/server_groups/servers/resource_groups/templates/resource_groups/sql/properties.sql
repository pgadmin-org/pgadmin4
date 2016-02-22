SELECT oid, rgrpname AS name, rgrpcpuratelimit AS cpu_rate_limit, rgrpdirtyratelimit AS dirty_rate_limit
FROM edb_resource_group
{% if rgid %}
WHERE oid={{rgid}}::int
{% endif %}
ORDER BY rgrpname