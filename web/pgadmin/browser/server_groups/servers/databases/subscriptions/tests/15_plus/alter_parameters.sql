-- Subscription: test_create_subscription

-- DROP SUBSCRIPTION IF EXISTS test_create_subscription;

CREATE SUBSCRIPTION test_create_subscription
    CONNECTION 'host=localhost port=5434 user=postgres dbname=postgres connect_timeout=10 sslmode=prefer'
    PUBLICATION test_pub
    WITH (connect = false, enabled = false, create_slot = false, slot_name = None, synchronous_commit = 'off', binary = false, streaming = 'False', two_phase = p, disable_on_error = false);
