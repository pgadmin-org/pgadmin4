CREATE SUBSCRIPTION test_create_subscription
    CONNECTION 'host=localhost port=5917 user=postgres dbname=postgres connect_timeout=10 password=xxxxxx sslmode=prefer'
    PUBLICATION test_publication
    WITH (connect = true, enabled = false, copy_data = false, create_slot = false, slot_name = test_create_subscription, synchronous_commit = 'remote_apply', binary = true, streaming = 'True', two_phase = true, disable_on_error = true, run_as_owner = true, password_required = true, origin = 'any', failover = false);
