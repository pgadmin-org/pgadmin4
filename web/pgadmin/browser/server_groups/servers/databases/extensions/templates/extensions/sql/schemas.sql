{#===================fetch all schemas==========================#}
SELECT nspname As schema FROM pg_namespace
    ORDER BY nspname
