ALTER TEXT SEARCH DICTIONARY public."Dictionary1_$%{}[]()&*^!@""'`\/#"
    RENAME TO "Test Dictionary Edit#1";

ALTER TEXT SEARCH DICTIONARY public."Test Dictionary Edit#1"
    (stopwords=english);

COMMENT ON TEXT SEARCH DICTIONARY public."Test Dictionary Edit#1"
    IS 'Test Description';
