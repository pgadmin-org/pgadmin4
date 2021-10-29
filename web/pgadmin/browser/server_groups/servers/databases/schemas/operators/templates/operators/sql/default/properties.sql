SELECT op.oid, op.oprname as name,  ns.nspname as schema,
    pg_catalog.pg_get_userbyid(op.oprowner) as owner,
    op.oprcanhash as support_hash, op.oprcanmerge as support_merge,
    ns.nspname as schema,
    CASE WHEN op.oprkind = 'b' THEN 'infix'
      WHEN op.oprkind = 'l' THEN 'prefix'
      WHEN op.oprkind = 'r' THEN 'postfix'
    ELSE 'unknown' END as oprkind, et.typname as resulttype,
    pg_catalog.format_type(lt.oid, NULL) as lefttype,
    pg_catalog.format_type(rt.oid, NULL) as righttype,
    co.oprname as commutator, op.oprcode as operproc,
    ne.oprname as negator, description,
    CASE WHEN op.oprrest = '-'::regproc THEN null ELSE op.oprrest END as restrproc,
    CASE WHEN op.oprjoin = '-'::regproc THEN null ELSE op.oprjoin END as joinproc
FROM pg_catalog.pg_operator op
    LEFT OUTER JOIN pg_catalog.pg_namespace ns ON ns.oid=op.oprnamespace
    LEFT OUTER JOIN pg_catalog.pg_type lt ON lt.oid=op.oprleft
    LEFT OUTER JOIN pg_catalog.pg_type rt ON rt.oid=op.oprright
    JOIN pg_catalog.pg_type et on et.oid=op.oprresult
    LEFT OUTER JOIN pg_catalog.pg_operator co ON co.oid=op.oprcom
    LEFT OUTER JOIN pg_catalog.pg_operator ne ON ne.oid=op.oprnegate
    LEFT OUTER JOIN pg_catalog.pg_description des ON (des.objoid=op.oid AND des.classoid='pg_operator'::regclass)
WHERE op.oprnamespace = {{scid}}::oid
{% if opid %}    AND op.oid = {{opid}}::oid {% endif %}
ORDER BY op.oprname;
