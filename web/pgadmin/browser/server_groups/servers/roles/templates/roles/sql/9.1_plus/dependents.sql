{% if fetch_database %}
SELECT 'd' as type, datname,
    datallowconn AND pg_catalog.has_database_privilege(datname, 'CONNECT') AS datallowconn,
    datdba, datlastsysoid
FROM pg_catalog.pg_database db
UNION
SELECT 'M', spcname, null, null, null
    FROM pg_catalog.pg_tablespace where spcowner= {{rid}}::oid
ORDER BY 1, 2
{% endif %}

{% if fetch_dependents %}
SELECT cl.relkind, COALESCE(cin.nspname, cln.nspname) as nspname,
    COALESCE(ci.relname, cl.relname) as relname, cl.relname as indname
FROM pg_catalog.pg_class cl
JOIN pg_catalog.pg_namespace cln ON cl.relnamespace=cln.oid
LEFT OUTER JOIN pg_catalog.pg_index ind ON ind.indexrelid=cl.oid
LEFT OUTER JOIN pg_catalog.pg_class ci ON ind.indrelid=ci.oid
LEFT OUTER JOIN pg_catalog.pg_namespace cin ON ci.relnamespace=cin.oid
WHERE cl.oid IN (SELECT objid FROM pg_catalog.pg_shdepend WHERE refobjid={{rid}}::oid) AND cl.oid > {{lastsysoid}}::oid
UNION ALL SELECT 'n', null, nspname, null
    FROM pg_catalog.pg_namespace nsp
    WHERE nsp.oid IN (SELECT objid FROM pg_catalog.pg_shdepend WHERE refobjid={{rid}}::oid) AND nsp.oid > {{lastsysoid}}::oid
UNION ALL SELECT CASE WHEN typtype='d' THEN 'd' ELSE 'y' END, null, typname, null
    FROM pg_catalog.pg_type ty
    WHERE ty.oid IN (SELECT objid FROM pg_catalog.pg_shdepend WHERE refobjid={{rid}}::oid) AND ty.oid > {{lastsysoid}}::oid
UNION ALL SELECT 'C', null, conname, null
    FROM pg_catalog.pg_conversion co
    WHERE co.oid IN (SELECT objid FROM pg_catalog.pg_shdepend WHERE refobjid={{rid}}::oid) AND co.oid > {{lastsysoid}}::oid
UNION ALL SELECT CASE WHEN prorettype=2279 THEN 'T' ELSE 'p' END, null, proname, null
    FROM pg_catalog.pg_proc pr
    WHERE pr.oid IN (SELECT objid FROM pg_catalog.pg_shdepend WHERE refobjid={{rid}}::oid) AND pr.oid > {{lastsysoid}}::oid
UNION ALL SELECT 'o', null, oprname || '('::text || COALESCE(tl.typname, ''::text) || CASE WHEN tl.oid IS NOT NULL
        AND tr.oid IS NOT NULL THEN ','::text END || COALESCE(tr.typname, ''::text) || ')'::text, null
    FROM pg_catalog.pg_operator op
    LEFT JOIN pg_catalog.pg_type tl ON tl.oid=op.oprleft
    LEFT JOIN pg_catalog.pg_type tr ON tr.oid=op.oprright
    WHERE op.oid IN (SELECT objid FROM pg_catalog.pg_shdepend WHERE refobjid={{rid}}::oid) AND op.oid > {{lastsysoid}}::oid
ORDER BY 1,2,3
{% endif %}
