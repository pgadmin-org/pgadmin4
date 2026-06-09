SELECT datlocale AS cname FROM pg_catalog.pg_database
WHERE datname = current_database() AND datlocprovider = 'i'
UNION
SELECT datcollate AS cname FROM pg_catalog.pg_database
WHERE datname = current_database() AND datlocprovider <> 'i'
UNION
SELECT datctype AS cname FROM pg_catalog.pg_database
WHERE datname = current_database() AND datlocprovider <> 'i';
