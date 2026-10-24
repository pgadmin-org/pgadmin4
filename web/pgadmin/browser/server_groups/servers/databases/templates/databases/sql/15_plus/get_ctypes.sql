{# datlocprovider and daticulocale both arrived in PostgreSQL 15, which is
   also where a database first stopped necessarily collating according to
   datcollate and datctype, so this bucket starts there. #}
SELECT daticulocale AS cname FROM pg_catalog.pg_database
WHERE datname = current_database() AND datlocprovider = 'i'
UNION
SELECT datcollate AS cname FROM pg_catalog.pg_database
WHERE datname = current_database() AND datlocprovider <> 'i'
UNION
SELECT datctype AS cname FROM pg_catalog.pg_database
WHERE datname = current_database() AND datlocprovider <> 'i';
