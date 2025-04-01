SELECT COUNT(*)
FROM pg_catalog.pg_class rel
    WHERE rel.relkind IN ('r','s','t','p') AND rel.relnamespace = {{ scid }}::oid
    AND NOT rel.relispartition;
