SELECT att.attname as name, att.*, def.*, pg_catalog.pg_get_expr(def.adbin, def.adrelid) AS defval,
        CASE WHEN att.attndims > 0 THEN 1 ELSE 0 END AS isarray,
        format_type(ty.oid,NULL) AS typname,
        format_type(ty.oid,att.atttypmod) AS displaytypname,
        tn.nspname as typnspname, et.typname as elemtypname,
        ty.typstorage AS defaultstorage, cl.relname, na.nspname,
        concat(quote_ident(na.nspname) ,'.', quote_ident(cl.relname)) AS parent_tbl,
	att.attstattarget, description, cs.relname AS sername,
	ns.nspname AS serschema,
	(SELECT count(1) FROM pg_type t2 WHERE t2.typname=ty.typname) > 1 AS isdup,
	indkey, coll.collname, nspc.nspname as collnspname , attoptions,
	-- Start pgAdmin4, added to save time on client side parsing
	CASE WHEN length(coll.collname) > 0 AND length(nspc.nspname) > 0  THEN
	  concat(quote_ident(nspc.nspname),'.',quote_ident(coll.collname))
	ELSE '' END AS collspcname,
	CASE WHEN strpos(format_type(ty.oid,att.atttypmod), '.') > 0 THEN
	  split_part(format_type(ty.oid,att.atttypmod), '.', 2)
	ELSE format_type(ty.oid,att.atttypmod) END AS cltype,
	-- End pgAdmin4
	EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid=att.attrelid AND contype='f' AND att.attnum=ANY(conkey)) As is_fk,
	(SELECT array_agg(provider || '=' || label) FROM pg_seclabels sl1 WHERE sl1.objoid=att.attrelid AND sl1.objsubid=att.attnum) AS seclabels,
	(CASE WHEN (att.attnum < 1) THEN true ElSE false END) AS is_sys_column
FROM pg_attribute att
  JOIN pg_type ty ON ty.oid=atttypid
  JOIN pg_namespace tn ON tn.oid=ty.typnamespace
  JOIN pg_class cl ON cl.oid=att.attrelid
  JOIN pg_namespace na ON na.oid=cl.relnamespace
  LEFT OUTER JOIN pg_type et ON et.oid=ty.typelem
  LEFT OUTER JOIN pg_attrdef def ON adrelid=att.attrelid AND adnum=att.attnum
  LEFT OUTER JOIN pg_description des ON (des.objoid=att.attrelid AND des.objsubid=att.attnum AND des.classoid='pg_class'::regclass)
  LEFT OUTER JOIN (pg_depend JOIN pg_class cs ON classid='pg_class'::regclass AND objid=cs.oid AND cs.relkind='S') ON refobjid=att.attrelid AND refobjsubid=att.attnum
  LEFT OUTER JOIN pg_namespace ns ON ns.oid=cs.relnamespace
  LEFT OUTER JOIN pg_index pi ON pi.indrelid=att.attrelid AND indisprimary
  LEFT OUTER JOIN pg_collation coll ON att.attcollation=coll.oid
  LEFT OUTER JOIN pg_namespace nspc ON coll.collnamespace=nspc.oid
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
