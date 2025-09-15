CREATE SUBSCRIPTION test_create_subscription
    CONNECTION 'host=localhost port=5434 user=postgres dbname=postgres connect_timeout=10 password=xxxxxx sslmode=prefer'
    PUBLICATION test_pub
    WITH (connect = true, enabled = false, copy_data = true, create_slot = true, slot_name = test_create_subscription, synchronous_commit = 'off', binary = false, streaming = 'False', two_phase = false, disable_on_error = false, run_as_owner = false, password_required = true, origin = 'any', failover = false);
