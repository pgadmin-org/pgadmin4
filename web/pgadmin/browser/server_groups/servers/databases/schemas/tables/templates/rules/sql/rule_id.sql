{#========Below will provide rule id for last created rule========#}
{% if rule_name %}
SELECT
    rw.oid
FROM
    pg_rewrite rw
WHERE
    rw.rulename={{ rule_name|qtLiteral }}
{% endif %}
