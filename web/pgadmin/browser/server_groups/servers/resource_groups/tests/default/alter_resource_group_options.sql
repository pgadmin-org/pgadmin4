-- RESOURCE GROUP: new_test_resql_resource_group

-- DROP RESOURCE GROUP new_test_resql_resource_group

CREATE RESOURCE GROUP new_test_resql_resource_group;

ALTER RESOURCE GROUP new_test_resql_resource_group
    SET cpu_rate_limit = 1, dirty_rate_limit = 5;
