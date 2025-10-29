-- Subscription: test_create_subscription

-- DROP SUBSCRIPTION IF EXISTS test_create_subscription;

CREATE SUBSCRIPTION test_create_subscription
    CONNECTION 'host=localhost port=5434 user=postgres dbname=postgres connect_timeout=10 sslmode=prefer'
    PUBLICATION test_publication
    WITH (connect = false, enabled = false, create_slot = false, slot_name = None, synchronous_commit = 'remote_apply', binary = true, streaming = 'on', two_phase = true, disable_on_error = true, run_as_owner = true, password_required = true, origin = 'any', failover = false);
