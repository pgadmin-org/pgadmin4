-- RESOURCE GROUP: test_resql_resource_group

-- DROP RESOURCE GROUP test_resql_resource_group

CREATE RESOURCE GROUP test_resql_resource_group;

ALTER RESOURCE GROUP test_resql_resource_group
    SET cpu_rate_limit = 0, dirty_rate_limit = 0;
