SELECT x.urilocation, x.execlocation, x.fmttype, x.fmtopts, x.command,
    x.rejectlimit, x.rejectlimittype,
    (SELECT relname
        FROM pg_catalog.pg_class
      WHERE Oid=x.fmterrtbl) AS errtblname,
    x.fmterrtbl = x.reloid AS errortofile ,
    pg_catalog.pg_encoding_to_char(x.encoding),
    x.writable,
    array_to_string(ARRAY(
      SELECT pg_catalog.quote_ident(option_name) || ' ' ||
      pg_catalog.quote_literal(option_value)
      FROM pg_options_to_table(x.options)
      ORDER BY option_name
      ), E',\n    ') AS options,
    gdp.attrnums AS distribution,
    c.relname AS name,
    nsp.nspname AS namespace
FROM pg_catalog.pg_exttable x,
  pg_catalog.pg_class c
  LEFT JOIN pg_catalog.pg_namespace nsp ON nsp.oid = c.relnamespace
  LEFT JOIN gp_distribution_policy gdp ON gdp.localoid = c.oid
WHERE x.reloid = c.oid AND c.oid = {{ table_oid }}::oid;
