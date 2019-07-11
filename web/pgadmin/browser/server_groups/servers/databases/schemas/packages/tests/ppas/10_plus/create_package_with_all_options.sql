-- Package: public."pkg_emp_$%{}[]()&*^!@""'`\/#"

-- DROP PACKAGE public."pkg_emp_$%{}[]()&*^!@""'`\/#";

CREATE OR REPLACE PACKAGE public."pkg_emp_$%{}[]()&*^!@""'`\/#"
IS
FUNCTION func1(v1 integer) RETURN integer;
END "pkg_emp_$%{}[]()&*^!@""'`\/#";


CREATE OR REPLACE PACKAGE BODY public."pkg_emp_$%{}[]()&*^!@""'`\/#"
IS
FUNCTION func1(v1 integer) RETURN integer IS BEGIN RETURN V1+10;END FUNC1;
END "pkg_emp_$%{}[]()&*^!@""'`\/#";

COMMENT ON PACKAGE public."pkg_emp_$%{}[]()&*^!@""'`\/#"
    IS 'test comment';
