-- Text Search Dictionary: public.Test Dictionary Edit#1

-- DROP TEXT SEARCH DICTIONARY IF EXISTS public."Test Dictionary Edit#1";

CREATE TEXT SEARCH DICTIONARY public."Test Dictionary Edit#1" (
    TEMPLATE = simple
);

COMMENT ON TEXT SEARCH DICTIONARY public."Test Dictionary Edit#1"
    IS 'Test Description';
