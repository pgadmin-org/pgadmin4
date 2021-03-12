SELECT att.attname as name, att.*, def.*, pg_catalog.pg_get_expr(def.adbin, def.adrelid) AS defval,
        CASE WHEN att.attndims > 0 THEN 1 ELSE 0 END AS isarray,
        pg_catalog.format_type(ty.oid,NULL) AS typname,
        pg_catalog.format_type(ty.oid,att.atttypmod) AS displaytypname,
        CASE WHEN ty.typelem > 0 THEN ty.typelem ELSE ty.oid END as elemoid,
        tn.nspname as typnspname, et.typname as elemtypname,
        ty.typstorage AS defaultstorage, cl.relname, na.nspname,
        pg_catalog.concat(pg_catalog.quote_ident(na.nspname) ,'.', pg_catalog.quote_ident(cl.relname)) AS parent_tbl,
	att.attstattarget, description, cs.relname AS sername,
	ns.nspname AS serschema,
	(SELECT count(1) FROM pg_catalog.pg_type t2 WHERE t2.typname=ty.typname) > 1 AS isdup,
	indkey, coll.collname, nspc.nspname as collnspname , attoptions,
	-- Start pgAdmin4, added to save time on client side parsing
	CASE WHEN length(coll.collname::text) > 0 AND length(nspc.nspname::text) > 0  THEN
	  pg_catalog.concat(pg_catalog.quote_ident(nspc.nspname),'.',pg_catalog.quote_ident(coll.collname))
	ELSE '' END AS collspcname,
	CASE WHEN pg_catalog.strpos(pg_catalog.format_type(ty.oid,att.atttypmod), '.') > 0 THEN
	  pg_catalog.split_part(pg_catalog.format_type(ty.oid,att.atttypmod), '.', 2)
	ELSE pg_catalog.format_type(ty.oid,att.atttypmod) END AS cltype,
	-- End pgAdmin4
	EXISTS(SELECT 1 FROM pg_catalog.pg_constraint WHERE conrelid=att.attrelid AND contype='f' AND att.attnum=ANY(conkey)) As is_fk,
	(SELECT pg_catalog.array_agg(provider || '=' || label) FROM pg_catalog.pg_seclabels sl1 WHERE sl1.objoid=att.attrelid AND sl1.objsubid=att.attnum) AS seclabels,
	(CASE WHEN (att.attnum < 1) THEN true ElSE false END) AS is_sys_column
FROM pg_catalog.pg_attribute att
  JOIN pg_catalog.pg_type ty ON ty.oid=atttypid
  JOIN pg_catalog.pg_namespace tn ON tn.oid=ty.typnamespace
  JOIN pg_catalog.pg_class cl ON cl.oid=att.attrelid
  JOIN pg_catalog.pg_namespace na ON na.oid=cl.relnamespace
  LEFT OUTER JOIN pg_catalog.pg_type et ON et.oid=ty.typelem
  LEFT OUTER JOIN pg_catalog.pg_attrdef def ON adrelid=att.attrelid AND adnum=att.attnum
  LEFT OUTER JOIN pg_catalog.pg_description des ON (des.objoid=att.attrelid AND des.objsubid=att.attnum AND des.classoid='pg_class'::regclass)
  LEFT OUTER JOIN (pg_catalog.pg_depend JOIN pg_catalog.pg_class cs ON classid='pg_class'::regclass AND objid=cs.oid AND cs.relkind='S') ON refobjid=att.attrelid AND refobjsubid=att.attnum
  LEFT OUTER JOIN pg_catalog.pg_namespace ns ON ns.oid=cs.relnamespace
  LEFT OUTER JOIN pg_catalog.pg_index pi ON pi.indrelid=att.attrelid AND indisprimary
  LEFT OUTER JOIN pg_catalog.pg_collation coll ON att.attcollation=coll.oid
  LEFT OUTER JOIN pg_catalog.pg_namespace nspc ON coll.collnamespace=nspc.oid
WHERE att.attrelid = {{tid}}::oid
{% if clid %}
    AND att.attnum = {{clid}}::int
{% endif %}
{### To show system objects ###}
{% if not show_sys_objects %}
    AND att.attnum > 0
{% endif %}
    AND att.attisdropped IS FALSE
    ORDER BY att.attnum
