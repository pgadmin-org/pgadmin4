SELECT
    typcategory
FROM
    pg_type
WHERE typname = {{datatype}};
