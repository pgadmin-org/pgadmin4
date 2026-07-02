{# Execute deletions safely within an isolated transaction block #}
BEGIN;

{# 1. Purge dependent child tasks assigned to this target execution context #}
DELETE FROM timetable.task WHERE chain_id = {{ chain_id|int }};

{# 2. Clear any execution log histories tracking this specific scheduler block #}
DELETE FROM timetable.execution_log WHERE chain_id = {{ chain_id|int }};

{# 3. Safe termination of the master background orchestration node #}
DELETE FROM timetable.chain WHERE chain_id = {{ chain_id|int }};

COMMIT;
