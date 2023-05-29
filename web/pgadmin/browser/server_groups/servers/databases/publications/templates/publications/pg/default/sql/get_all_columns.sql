SELECT
  pg_catalog.quote_ident(attname) as column
FROM
  pg_attribute
WHERE
  attrelid = '{{ tid }}' :: regclass
  and attstattarget =-1;