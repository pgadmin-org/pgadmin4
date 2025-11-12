SELECT t.oid,t.tgname AS name, t.xmin, t.tgenabled AS is_enable_trigger, t.tgtype, t.tgattr, relname,
    CASE WHEN relkind = 'r' THEN TRUE ELSE FALSE END AS parentistable,
    nspname, des.description,
    pg_catalog.regexp_replace(
        regexp_replace(
            pg_catalog.pg_get_triggerdef(t.oid),
            'CREATE TRIGGER (.*) FOR (.*) ON (.*) \nCOMPOUND TRIGGER (.*)\n', ''), '[\n]?END$', ''
    ) AS prosrc,
{% if datlastsysoid %}
    (CASE WHEN t.oid <= {{ datlastsysoid}}::oid THEN true ElSE false END) AS is_sys_trigger,
{% endif %}
    COALESCE(pg_catalog.substring(pg_catalog.pg_get_triggerdef(t.oid), 'WHEN (.*) \nCOMPOUND'), NULL) AS whenclause
FROM pg_catalog.pg_trigger t
    JOIN pg_catalog.pg_class cl ON cl.oid=tgrelid
    JOIN pg_catalog.pg_namespace na ON na.oid=relnamespace
    LEFT OUTER JOIN pg_catalog.pg_description des ON (des.objoid=t.oid AND des.classoid='pg_trigger'::regclass)
WHERE NOT tgisinternal
    AND tgrelid = {{tid}}::OID
    AND tgpackageoid != 0
{% if trid %}
    AND t.oid = {{trid}}::OID
{% endif %}
ORDER BY tgname;
