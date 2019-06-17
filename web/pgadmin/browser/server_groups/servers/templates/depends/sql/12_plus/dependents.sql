SELECT DISTINCT dep.deptype, dep.classid, cl.relkind, ad.adbin, pg_get_expr(ad.adbin, ad.adrelid) as adsrc,
    CASE WHEN cl.relkind IS NOT NULL THEN cl.relkind || COALESCE(dep.objsubid::text, '')
        WHEN tg.oid IS NOT NULL THEN 'T'::text
        WHEN ty.oid IS NOT NULL THEN 'y'::text
        WHEN ns.oid IS NOT NULL THEN 'n'::text
        WHEN pr.oid IS NOT NULL AND prtyp.typname = 'trigger' THEN 't'::text
        WHEN pr.oid IS NOT NULL THEN 'P'::text
        WHEN la.oid IS NOT NULL THEN 'l'::text
        WHEN rw.oid IS NOT NULL THEN 'R'::text
        WHEN co.oid IS NOT NULL THEN 'C'::text || contype
        WHEN ad.oid IS NOT NULL THEN 'A'::text
        WHEN fs.oid IS NOT NULL THEN 'F'::text
        WHEN fdw.oid IS NOT NULL THEN 'f'::text
        ELSE ''
    END AS type,
    COALESCE(coc.relname, clrw.relname) AS ownertable,
    CASE WHEN cl.relname IS NOT NULL AND att.attname IS NOT NULL THEN cl.relname || COALESCE('.' || att.attname, '')
    ELSE COALESCE(cl.relname, co.conname, pr.proname, tg.tgname, ty.typname, la.lanname, rw.rulename, ns.nspname, fs.srvname, fdw.fdwname)
    END AS refname,
    COALESCE(nsc.nspname, nso.nspname, nsp.nspname, nst.nspname, nsrw.nspname) AS nspname,
    CASE WHEN inhits.inhparent IS NOT NULL THEN '1' ELSE '0' END AS is_inherits,
    CASE WHEN inhed.inhparent IS NOT NULL THEN '1' ELSE '0' END AS is_inherited
FROM pg_depend dep
LEFT JOIN pg_class cl ON dep.objid=cl.oid
LEFT JOIN pg_attribute att ON dep.objid=att.attrelid AND dep.objsubid=att.attnum
LEFT JOIN pg_namespace nsc ON cl.relnamespace=nsc.oid
LEFT JOIN pg_proc pr ON dep.objid=pr.oid
LEFT JOIN pg_namespace nsp ON pr.pronamespace=nsp.oid
LEFT JOIN pg_trigger tg ON dep.objid=tg.oid
LEFT JOIN pg_type ty ON dep.objid=ty.oid
LEFT JOIN pg_namespace nst ON ty.typnamespace=nst.oid
LEFT JOIN pg_constraint co ON dep.objid=co.oid
LEFT JOIN pg_class coc ON co.conrelid=coc.oid
LEFT JOIN pg_namespace nso ON co.connamespace=nso.oid
LEFT JOIN pg_rewrite rw ON dep.objid=rw.oid
LEFT JOIN pg_class clrw ON clrw.oid=rw.ev_class
LEFT JOIN pg_namespace nsrw ON clrw.relnamespace=nsrw.oid
LEFT JOIN pg_language la ON dep.objid=la.oid
LEFT JOIN pg_namespace ns ON dep.objid=ns.oid
LEFT JOIN pg_attrdef ad ON ad.oid=dep.objid
LEFT JOIN pg_foreign_server fs ON fs.oid=dep.objid
LEFT JOIN pg_foreign_data_wrapper fdw ON fdw.oid=dep.objid
LEFT JOIN pg_type prtyp ON prtyp.oid = pr.prorettype
LEFT JOIN pg_inherits inhits ON (inhits.inhrelid=dep.objid)
LEFT JOIN pg_inherits inhed ON (inhed.inhparent=dep.objid)
{{where_clause}} AND
classid IN ( SELECT oid FROM pg_class WHERE relname IN
   ('pg_class', 'pg_constraint', 'pg_conversion', 'pg_language', 'pg_proc', 'pg_rewrite', 'pg_namespace',
   'pg_trigger', 'pg_type', 'pg_attrdef', 'pg_event_trigger', 'pg_foreign_server', 'pg_foreign_data_wrapper'))
ORDER BY classid, cl.relkind
