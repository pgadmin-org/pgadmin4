{# Tokens for FTS CONFIGURATION node #}

{% if parseroid %}
SELECT
    alias
FROM
    pg_catalog.ts_token_type({{parseroid}}::OID)
ORDER BY
    alias
{% endif %}
