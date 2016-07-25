{# ============= Get all the properties of foreign data wrapper ============= #}
SELECT fdw.oid as fdwoid, fdwname as name, fdwhandler, fdwvalidator, description,
    array_to_string(fdwoptions, ',') AS fdwoptions, pg_get_userbyid(fdwowner) as fdwowner, array_to_string(fdwacl::text[], ', ') as acl,
    quote_ident(vp_nsp.nspname)||'.'||quote_ident(vp.proname) AS fdwvalue,
    quote_ident(vh_nsp.nspname)||'.'||quote_ident(vh.proname) AS fdwhan
FROM pg_foreign_data_wrapper fdw
LEFT OUTER JOIN pg_proc vh on vh.oid=fdwhandler
LEFT OUTER JOIN pg_proc vp on vp.oid=fdwvalidator
LEFT OUTER JOIN pg_namespace vh_nsp ON vh_nsp.oid=vh.pronamespace
LEFT OUTER JOIN pg_namespace vp_nsp ON vp_nsp.oid=vp.pronamespace
LEFT OUTER JOIN pg_description des ON (des.objoid=fdw.oid AND des.objsubid=0 AND des.classoid='pg_foreign_data_wrapper'::regclass)
{% if fid %}
WHERE fdw.oid={{fid}}::int
{% endif %}
{% if fname %}
WHERE fdw.fdwname={{ fname|qtLiteral }}::text
{% endif %}
ORDER BY fdwname
