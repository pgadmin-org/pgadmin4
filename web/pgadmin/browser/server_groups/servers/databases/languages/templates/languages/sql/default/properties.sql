SELECT
    lan.oid as oid, lanname as name, lanpltrusted as trusted,
    pg_catalog.array_to_string(lanacl::text[], ', ') as acl, hp.proname as lanproc,
    vp.proname as lanval, description,
    pg_catalog.pg_get_userbyid(lan.lanowner) as lanowner, ip.proname as laninl,
    (SELECT pg_catalog.array_agg(provider || '=' || label) FROM pg_catalog.pg_seclabel sl1 WHERE sl1.objoid=lan.oid) AS seclabels
FROM
    pg_catalog.pg_language lan JOIN pg_catalog.pg_proc hp ON hp.oid=lanplcallfoid
    LEFT OUTER JOIN pg_catalog.pg_proc ip ON ip.oid=laninline
    LEFT OUTER JOIN pg_catalog.pg_proc vp ON vp.oid=lanvalidator
    LEFT OUTER JOIN pg_catalog.pg_description des
        ON (
            des.objoid=lan.oid AND des.objsubid=0 AND
            des.classoid='pg_language'::regclass
        )
WHERE lanispl IS TRUE
{% if lid %} AND
    lan.oid={{lid}}::oid
{% endif %}
{% if lanname %} AND
    lanname={{ lanname|qtLiteral }}::text
{% endif %}
ORDER BY lanname
