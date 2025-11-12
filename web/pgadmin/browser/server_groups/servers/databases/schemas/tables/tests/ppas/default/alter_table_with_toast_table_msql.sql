ALTER TABLE IF EXISTS public."table_with_custom_autovaccum_$%{}[]()&*^!@""'`\/#" SET (
    autovacuum_analyze_threshold = 60,
    autovacuum_vacuum_cost_limit = 100
);
ALTER TABLE IF EXISTS public."table_with_custom_autovaccum_$%{}[]()&*^!@""'`\/#" RESET (
    autovacuum_enabled
);

ALTER TABLE IF EXISTS public."table_with_custom_autovaccum_$%{}[]()&*^!@""'`\/#" SET (
    toast.autovacuum_enabled = false,
    toast.autovacuum_freeze_max_age = 2000000,
    toast.autovacuum_vacuum_cost_delay = 50,
    toast.autovacuum_vacuum_cost_limit = 13,
    toast.autovacuum_vacuum_threshold = 70
);
