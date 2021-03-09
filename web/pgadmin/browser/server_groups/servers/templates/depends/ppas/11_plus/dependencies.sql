SELECT DISTINCT dep.deptype, dep.refclassid, dep.refobjid, cl.relkind, ad.adbin, ad.adsrc,
    CASE WHEN cl.relkind IS NOT NULL THEN CASE WHEN cl.relkind = 'r' THEN cl.relkind || COALESCE(dep.refobjsubid::text, '') ELSE cl.relkind END
        WHEN tg.oid IS NOT NULL THEN 'Tr'::text
        WHEN ty.oid IS NOT NULL THEN CASE WHEN ty.typtype = 'd' THEN 'd'::text ELSE 'Ty'::text END
        WHEN ns.oid IS NOT NULL THEN CASE WHEN ns.nspparent != 0 THEN 'Pa'::text ELSE 'n'::text END
        WHEN pr.oid IS NOT NULL AND (prtyp.typname = 'trigger' OR prtyp.typname = 'event_trigger') THEN 'Pt'::text
        WHEN pr.oid IS NOT NULL THEN CASE WHEN pr.prokind = 'p' THEN 'Pp'::text ELSE 'Pf'::text END
        WHEN la.oid IS NOT NULL THEN 'l'::text
        WHEN rw.oid IS NOT NULL THEN 'Rl'::text
        WHEN co.oid IS NOT NULL THEN CASE WHEN co.contypid > 0 THEN 'Cd' ELSE 'C'::text || contype END
        WHEN ad.oid IS NOT NULL THEN 'A'::text
        WHEN fs.oid IS NOT NULL THEN 'Fs'::text
        WHEN fdw.oid IS NOT NULL THEN 'Fw'::text
        WHEN evt.oid IS NOT NULL THEN 'Et'::text
        WHEN col.oid IS NOT NULL THEN 'Co'::text
        WHEN ftsc.oid IS NOT NULL THEN 'Fc'::text
        WHEN ftsp.oid IS NOT NULL THEN 'Fp'::text
        WHEN ftsd.oid IS NOT NULL THEN 'Fd'::text
        WHEN ftst.oid IS NOT NULL THEN 'Ft'::text
        WHEN ext.oid IS NOT NULL THEN 'Ex'::text
        WHEN syn.oid IS NOT NULL THEN 'Sy'::text
        WHEN pl.oid IS NOT NULL THEN 'Rs'::text
    ELSE ''
    END AS type,
    COALESCE(coc.relname, clrw.relname) AS ownertable,
    CASE WHEN cl.relname IS NOT NULL OR att.attname IS NOT NULL THEN cl.relname || COALESCE('.' || att.attname, '')
    ELSE COALESCE(cl.relname, co.conname, pr.proname, tg.tgname, ty.typname, la.lanname, rw.rulename, ns.nspname,
                  fs.srvname, fdw.fdwname, evt.evtname, col.collname, ftsc.cfgname, ftsd.dictname, ftsp.prsname,
                  ftst.tmplname, ext.extname, syn.synname, pl.polname)
    END AS refname,
    COALESCE(nsc.nspname, nso.nspname, nsp.nspname, nst.nspname, nsrw.nspname, colns.nspname, ftscns.nspname,
        ftsdns.nspname, ftspns.nspname, ftstns.nspname, synns.nspname) AS nspname,
    CASE WHEN inhits.inhparent IS NOT NULL THEN '1' ELSE '0' END AS is_inherits,
    CASE WHEN inhed.inhparent IS NOT NULL THEN '1' ELSE '0' END AS is_inherited
FROM pg_catalog.pg_depend dep
LEFT JOIN pg_catalog.pg_class cl ON dep.refobjid=cl.oid
LEFT JOIN pg_catalog.pg_attribute att ON dep.refobjid=att.attrelid AND dep.refobjsubid=att.attnum
LEFT JOIN pg_catalog.pg_namespace nsc ON cl.relnamespace=nsc.oid
LEFT JOIN pg_catalog.pg_proc pr ON dep.refobjid=pr.oid
LEFT JOIN pg_catalog.pg_namespace nsp ON pr.pronamespace=nsp.oid
LEFT JOIN pg_catalog.pg_trigger tg ON dep.refobjid=tg.oid
LEFT JOIN pg_catalog.pg_type ty ON dep.refobjid=ty.oid
LEFT JOIN pg_catalog.pg_namespace nst ON ty.typnamespace=nst.oid
LEFT JOIN pg_catalog.pg_constraint co ON dep.refobjid=co.oid
LEFT JOIN pg_catalog.pg_class coc ON co.conrelid=coc.oid
LEFT JOIN pg_catalog.pg_namespace nso ON co.connamespace=nso.oid
LEFT JOIN pg_catalog.pg_rewrite rw ON dep.refobjid=rw.oid
LEFT JOIN pg_catalog.pg_class clrw ON clrw.oid=rw.ev_class
LEFT JOIN pg_catalog.pg_namespace nsrw ON clrw.relnamespace=nsrw.oid
LEFT JOIN pg_catalog.pg_language la ON dep.refobjid=la.oid
LEFT JOIN pg_catalog.pg_namespace ns ON dep.refobjid=ns.oid
LEFT JOIN pg_catalog.pg_attrdef ad ON ad.adrelid=att.attrelid AND ad.adnum=att.attnum
LEFT JOIN pg_catalog.pg_foreign_server fs ON fs.oid=dep.refobjid
LEFT JOIN pg_catalog.pg_foreign_data_wrapper fdw ON fdw.oid=dep.refobjid
LEFT JOIN pg_catalog.pg_type prtyp ON prtyp.oid = pr.prorettype
LEFT JOIN pg_catalog.pg_inherits inhits ON (inhits.inhrelid=dep.refobjid)
LEFT JOIN pg_catalog.pg_inherits inhed ON (inhed.inhparent=dep.refobjid)
LEFT JOIN pg_catalog.pg_event_trigger evt ON evt.oid=dep.refobjid
LEFT JOIN pg_catalog.pg_collation col ON col.oid=dep.refobjid
LEFT JOIN pg_catalog.pg_namespace colns ON col.collnamespace=colns.oid
LEFT JOIN pg_catalog.pg_ts_config ftsc ON ftsc.oid=dep.refobjid
LEFT JOIN pg_catalog.pg_namespace ftscns ON ftsc.cfgnamespace=ftscns.oid
LEFT JOIN pg_catalog.pg_ts_dict ftsd ON ftsd.oid=dep.refobjid
LEFT JOIN pg_catalog.pg_namespace ftsdns ON ftsd.dictnamespace=ftsdns.oid
LEFT JOIN pg_catalog.pg_ts_parser ftsp ON ftsp.oid=dep.refobjid
LEFT JOIN pg_catalog.pg_namespace ftspns ON ftsp.prsnamespace=ftspns.oid
LEFT JOIN pg_catalog.pg_ts_template ftst ON ftst.oid=dep.refobjid
LEFT JOIN pg_catalog.pg_namespace ftstns ON ftst.tmplnamespace=ftstns.oid
LEFT JOIN pg_catalog.pg_extension ext ON ext.oid=dep.refobjid
LEFT JOIN pg_catalog.pg_synonym syn ON syn.oid=dep.refobjid
LEFT JOIN pg_catalog.pg_namespace synns ON syn.synnamespace=synns.oid
LEFT JOIN pg_catalog.pg_policy pl ON pl.oid=dep.refobjid
{{where_clause}} AND
refclassid IN ( SELECT oid FROM pg_catalog.pg_class WHERE relname IN
   ('pg_class', 'pg_constraint', 'pg_conversion', 'pg_language', 'pg_proc', 'pg_rewrite', 'pg_namespace',
   'pg_trigger', 'pg_type', 'pg_attrdef', 'pg_event_trigger', 'pg_foreign_server', 'pg_foreign_data_wrapper',
   'pg_collation', 'pg_ts_config', 'pg_ts_dict', 'pg_ts_parser', 'pg_ts_template', 'pg_extension',
   'pg_synonym', 'pg_policy'))
UNION
SELECT DISTINCT dep.deptype, dep.refclassid, dep.refobjid, cl.relkind, ad.adbin, ad.adsrc,
    CASE WHEN cl.relkind IS NOT NULL THEN CASE WHEN cl.relkind = 'r' THEN cl.relkind || COALESCE(dep.refobjsubid::text, '') ELSE cl.relkind END
    ELSE '' END AS type,
	NULL AS ownertable,
	CASE WHEN cl.relname IS NOT NULL OR att.attname IS NOT NULL THEN cl.relname || COALESCE('.' || att.attname, '')
    ELSE cl.relname END AS refname,
    nsc.nspname AS nspname, '0' AS is_inherits, '0' AS is_inherited
FROM pg_catalog.pg_depend dep
LEFT JOIN pg_catalog.pg_class cl ON dep.refobjid=cl.oid
LEFT JOIN pg_catalog.pg_attribute att ON dep.refobjid=att.attrelid AND dep.refobjsubid=att.attnum
LEFT JOIN pg_catalog.pg_namespace nsc ON cl.relnamespace=nsc.oid
LEFT JOIN pg_catalog.pg_attrdef ad ON ad.adrelid=att.attrelid AND ad.adnum=att.attnum
WHERE dep.objid IN (SELECT oid FROM pg_catalog.pg_rewrite WHERE ev_class={{object_id}}) AND cl.relkind not in ('v', 'm')
ORDER BY refclassid, relkind
