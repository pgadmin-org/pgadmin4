SELECT
    format_type(oid, NULL) AS out_arg_type
FROM
    pg_type
WHERE
    oid = {{ out_arg_oid }}::oid;
