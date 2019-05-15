{% if tid %}
SELECT
    t.typnamespace as scid
FROM
    pg_type t
WHERE
    t.oid = {{tid}}::oid;
{% else %}
SELECT
    ns.oid as scid
FROM
    pg_namespace ns
WHERE
    ns.nspname = {{schema|qtLiteral}}::text;
{% endif %}
