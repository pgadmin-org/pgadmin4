ALTER TABLE public."table_like_tbl$%{}[]()&*^!@""'`\/#"
    SET (FILLFACTOR=13);

COMMENT ON TABLE public."table_like_tbl$%{}[]()&*^!@""'`\/#"
  IS 'test comment';

GRANT TRUNCATE, REFERENCES, TRIGGER ON TABLE public."table_like_tbl$%{}[]()&*^!@""'`\/#" TO PUBLIC;
