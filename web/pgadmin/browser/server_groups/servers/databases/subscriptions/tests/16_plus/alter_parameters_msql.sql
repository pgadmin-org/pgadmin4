ALTER SUBSCRIPTION test_create_subscription
    SET (synchronous_commit = 'off', binary = false, streaming = 'parallel', disable_on_error = false, origin = 'none');
