SELECT
    typcategory
FROM
    pg_catalog.pg_type
WHERE typname = {{datatype}};
