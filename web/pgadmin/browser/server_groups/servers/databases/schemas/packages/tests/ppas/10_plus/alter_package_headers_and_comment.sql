-- Package: public."pkg_emp_$%{}[]()&*^!@""'`\/#"

-- DROP PACKAGE public."pkg_emp_$%{}[]()&*^!@""'`\/#";

CREATE OR REPLACE PACKAGE public."pkg_emp_$%{}[]()&*^!@""'`\/#"
IS
PROCEDURE get_name(p_empno numeric);
END "pkg_emp_$%{}[]()&*^!@""'`\/#";


COMMENT ON PACKAGE public."pkg_emp_$%{}[]()&*^!@""'`\/#"
    IS 'test comment updated';
