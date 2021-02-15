SELECT subpublications AS pub FROM pg_subscription
WHERE subname = '{{subname}}';
