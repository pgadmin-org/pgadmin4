SELECT t.oid,t.tgname AS name, t.xmin, t.tgenabled AS is_enable_trigger, t.*, relname, CASE WHEN relkind = 'r' THEN TRUE ELSE FALSE END AS parentistable,
    nspname, des.description, l.lanname, p.prosrc, p.proname AS tfunction,
    COALESCE(pg_catalog.substring(pg_catalog.pg_get_triggerdef(t.oid, true), 'WHEN (.*) EXECUTE (PROCEDURE|FUNCTION)'),
    pg_catalog.substring(pg_catalog.pg_get_triggerdef(t.oid, true), 'WHEN (.*)  \$trigger')) AS whenclause,
    -- We need to convert tgargs column bytea datatype to array datatype
    (pg_catalog.string_to_array(encode(tgargs, 'escape'), E'\\000')::text[])[1:tgnargs] AS custom_tgargs,
{% if datlastsysoid %}
    (CASE WHEN t.oid <= {{ datlastsysoid}}::oid THEN true ElSE false END) AS is_sys_trigger,
{% endif %}
    (CASE WHEN tgconstraint != 0::OID THEN true ElSE false END) AS is_constraint_trigger,
    tgoldtable,
    tgnewtable
FROM pg_catalog.pg_trigger t
    JOIN pg_catalog.pg_class cl ON cl.oid=tgrelid
    JOIN pg_catalog.pg_namespace na ON na.oid=relnamespace
    LEFT OUTER JOIN pg_catalog.pg_description des ON (des.objoid=t.oid AND des.classoid='pg_trigger'::regclass)
    LEFT OUTER JOIN pg_catalog.pg_proc p ON p.oid=t.tgfoid
    LEFT OUTER JOIN pg_catalog.pg_language l ON l.oid=p.prolang
WHERE NOT tgisinternal
    AND tgrelid = {{tid}}::OID
    AND tgpackageoid = 0
{% if trid %}
    AND t.oid = {{trid}}::OID
{% endif %}
ORDER BY tgname;
