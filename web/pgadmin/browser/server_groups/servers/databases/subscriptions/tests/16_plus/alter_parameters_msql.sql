ALTER SUBSCRIPTION test_create_subscription
    SET (synchronous_commit = 'off', binary = false, streaming = 'False', disable_on_error = false, run_as_owner = false, origin = 'none');
