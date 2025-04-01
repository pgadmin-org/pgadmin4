CREATE SUBSCRIPTION test_create_subscription
    CONNECTION 'host=localhost port=5434 user=postgres dbname=postgres connect_timeout=10 password=xxxxxx sslmode=prefer'
    PUBLICATION test_pub
    WITH (connect = false, enabled = false, copy_data = false, create_slot = false, slot_name = None, synchronous_commit = 'remote_apply', binary = true, streaming = 'True', two_phase = true, disable_on_error = true);
