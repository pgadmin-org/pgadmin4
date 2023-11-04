-- Subscription: test_alter_subscription

-- DROP SUBSCRIPTION IF EXISTS test_alter_subscription;

CREATE SUBSCRIPTION test_alter_subscription
    CONNECTION 'host=localhost port=5432 user=postgres dbname=edb connect_timeout=10 sslmode=prefer'
    PUBLICATION sample__1
    WITH (connect = false, enabled = false, create_slot = false, slot_name = None, synchronous_commit = 'remote_apply');
