SELECT
    t.typnamespace as scid
FROM
    pg_type t
WHERE
    t.typname = {{tname|qtLiteral}}::text;
