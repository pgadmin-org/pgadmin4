{# Both the ICU and the builtin provider keep the locale in datlocale; only a
   libc database collates according to datcollate and datctype, which a
   builtin database merely inherits from its template. #}
SELECT datlocale AS cname FROM pg_catalog.pg_database
WHERE datname = current_database() AND datlocprovider IN ('i', 'b')
UNION
SELECT datcollate AS cname FROM pg_catalog.pg_database
WHERE datname = current_database() AND datlocprovider = 'c'
UNION
SELECT datctype AS cname FROM pg_catalog.pg_database
WHERE datname = current_database() AND datlocprovider = 'c';
