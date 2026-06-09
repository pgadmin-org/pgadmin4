SELECT
  pg_catalog.quote_ident(attname) as column
FROM pg_catalog.pg_attribute
WHERE
  attrelid = '{{ tid }}' :: regclass
  and attnum > 0;
