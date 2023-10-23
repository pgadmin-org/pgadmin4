pgAdmin 4 Test Framework
========================

This regression framework is designed to execute unit tests for all modules to
help catch regressions in the code.

Assumptions
-----------

- pgAdmin must have SMTP configured if SERVER_MODE == True.
- There should be a single server group present in the browser.
- Currently each module will have testcases related to ONLY GET, POST, PUT,
  and DELETE api’s.

Environment
-----------

Regression tests should be run in a Python environment that has all the
pre-requisite packages installed from $PGADMIN4_SRC/requirements.txt. There
are some additional dependencies for running the test suite; these can be
installed with:

(pgadmin4) $ pip install -r $PGADMIN4_SRC/web/regression/requirements.txt

While running in Linux environments install:

(pgadmin4) $ sudo apt-get install xsel

Otherwise the following error happens:
"Pyperclip could not find a copy/paste mechanism for your system"

General Information
-------------------

1) The required test cases should be placed under the /tests directory of the
   respective module.

  - 'pgadmin/browser/tests' directory contains test-cases for following
    modules:

	1. Login Page
	2. Reset Password Page
	3. Change Password Page
	4. Logout Page

  - 'pgAdmin4/web/pgadmin/browser/server_groups/tests/' shows an example of
     tree traversal of the pgAdmin modules and how the test folder is required
     for each individual module.

  - 'pgadmin/browser/server_groups/servers/tests/' directory will have separate
     file for each test-case:

    1. test_server_add.py
    2. test_server_delete.py
    3. test_server_get.py
    4. test_server_update.py

2) The pgAdmin4 source tree includes 2 different configuration file templates.
   One file template for the server configuration
   named ‘test_config.json.in' and another for test configuration named
   'test_advanced_config.json.in' in the ‘pgAdmin4/web/regression’ directory.
   After completing the pgAdmin4 configuration, you must make a working copy of
   the templates called test_config.json and test_advance_config.json
   before modifying the file contents.

    2a) The following command copies the test_config.json.in file, creating a
        configuration file named test_config.json (same way user can copy
        test_advance_config.json.in file into test_advance_config.json)

             $ cp pgadmin4/web/regression/test_config.json.in \
               pgadmin4/web/regression/test_config.json

    2b) After creating the server and test configuration file, add (or modify)
        parameter values as per requirements. The pgAdmin4 regression framework
        expects to find the files in the  directory
        '/<installation dir>/web/regression/'. If you move the file to another
        location, you must create a symbolic link that specifies the new location.

    2c) Specifying Server Configuration file:

        Server details and connection properties as per their local setup. The
        test_config file is in JSON format and property values are
        case-sensitive.

    2d) Specifying the Test Configuration file:

        The user can add/change test data as per their need. The
        test_advanced_config file is in JSON format and property values are
        case-sensitive.


Test Data Details
-----------------

	"pgAdmin4 Login Credentials" (used to login to pgAdmin):

	 login_username = login id
	 login_password = login password
	 new_password = new login password

	"pgAdmin4 Test User Credentials" (dummy user used for testing user management):

	 login_username = login id
	 login_password = login password
	 new_password = new login password

	 "server_credentials":

     name = Server/database Name
     db_username = Database Username
     host = IP Address of Server
     db_password = Database Password
     db_port = Database Port
     maintenance_db = Maintenance Database
     sslmode = SSL Mode
     comment = Any Comments to add
     tablespace_path = A path under which a tablespace can be created


Execution:
-----------

Python Tests:

- For feature tests to run as part of the entire test suite, Chrome and
  chromedriver need to be installed; get chromedriver from
  https://sites.google.com/a/chromium.org/chromedriver/downloads or a
  package manager and make sure it is in the PATH

- For feature tests to run on Firefox, geckodriver need to be installed;
  - Get geckodriver from https://github.com/mozilla/geckodriver/releases.
  - Extract the binary and run chmod +x geckodriver.
  - Copy geckodriver into /usr/local/bin or make sure path of the
    geckodriver must be specified in the PATH.
  - Set the "default_browser" parameter in test_config file or pass the command
    line option --default_browser. Supported browsers are "Chrome" and
    "Firefox".

- The test framework is modular and pluggable and dynamically locates tests
  for modules which are discovered at runtime. All test cases are found
  and registered automatically by its module name in
  'pgadmin4/web/pgadmin/utils/test.py' file.

- To run Feature Tests in parallel using selenoid(grid + docker), selenoid
  need to be installed nad should be run only with SERVER_MODE=True.
  Steps to install selenoid -

  - Install & Start docker
    $yum -y install docker docker-registry
    $vi /etc/sysconfig/docker   # in OPTIONS add ‘--selinux-enabled=false’
    $systemctl enable docker.service
    $systemctl start docker.service
    $systemctl status docker.service

  - Install & Start Selenoid
    $curl -s https://aerokube.com/cm/bash | bash
    $./cm selenoid start --vnc --args "-limit 3 -cpu 1.5 -mem 1.5g"
    $./cm selenoid-ui start
    Check selenoid status -
    http://<IP address of Selenoid Installed machine>:4444/status
            - Should show json with browsers details
    http://<IP address of Selenoid Installed machine>:8080/#/
            - Capabilities shows available browser
    Note : In --args "-limit 3 -cpu 1.5 -mem 1.5g"
                -limit 3 :limits maximum parallel sessions(dockers) in selenoid,
                -cpu :limit memory and CPU usage,
                -mem :limit memory per session.
           Generally max parallel session is the number of cores * 1.5 – 2
           You can list available flags by using ./cm selenoid args
    Additional Information about tool
            - https://aerokube.com/selenoid/latest/

  - Update 'test_config.json' with selenoid config information
    pgAdmin_default_server -
        It is the IP address for the machine where pgadmin source code is
        present.Value should NOT be '127.0.0.1' even though everything runs
        on the same machine.
        You can get it on linux running command  'ifconfig | grep inet'
        e.g. - 192.168.143.121
    max_parallel_sessions -
        This is other way to control number of tests to be run in parallel.
        This should be equal or less than limit specified while setting up
        selenoid
    selenoid_url -
        Url should be formed as below -
        http://<IP address of Selenoid Installed machine>:4444/wd/hub/
        e.g. - selenoid_url": "http://192.168.143.121:4444/wd/hub"
        If source code & selenoid servers are on same machine then
        selenoid url value can be - "http://localhost:4444/wd/hub"
    browsers_list -
        List of browser name & version enclosed in {} on which tests to be
        executed.
        Make sure list contains those browsers & versions only which are shown
        in capabilities tab while in selenoid status web-page.
        If version is mention as null, then latest version available in
        selenoid server will be used for execution.
        e.g. - [ {"name": "Chrome","version": "80.0"},
                 {"name": "Firefox","version": "74.0"}]

- Change to the regression test directory:
     run 'cd web/regression'

- Execute the test framework for all nodes
     run 'python runtests.py --pkg all' or just:
         'python runtests.py'

- Execute test framework for entire package

     Example 1) Run test framework for 'browser' package
     run 'python runtests.py --pkg browser'

     Example 2) Run test framework for 'database' package
     run 'python runtests.py --pkg browser.server_groups.servers.databases'

     Example 3) Run feature tests
     run 'python runtests.py --pkg feature_tests

- Execute test framework for single node at a time

     Example 1) Run test framework for 'browser' node
     run 'python runtests.py --pkg browser.server_groups.tests'

     Example 2) Run test framework for 'database' node
     run 'python runtests.py --pkg browser.server_groups.servers.databases.tests'

- Execute test framework for certain modules of a test pkg

     Example 1) Run test framework for 'sqleditor' package and test_start_running_query module
     run 'python runtests.py --pkg tools.sqleditor --modules test_start_running_query'

     Example 2) Run test framework for 'sqleditor' package and test_start_running_query,test_query_tool_fs_utils modules
     run 'python runtests.py --pkg tools.sqleditor --modules test_start_running_query,test_query_tool_fs_utils'

- Exclude a package and its subpackages when running tests:

    Example: exclude feature tests but run all others:
    run 'python runtests.py --exclude feature_tests'

    Example: exclude multiple packages:
    run 'python runtests.py --exclude browser.server_groups.servers.databases,browser.server_groups.servers.tablespaces'

- Execute reverse engineered SQL test framework
     Example 1) Execute only reverse engineered sql test framework for all nodes
         run 'python runtests.py --pkg resql'

     Example 2)  Execute only reverse engineered SQL test framework for some modules
         run 'python runtests.py --pkg resql --modules sequences,functions'

     Example 3) Exclude reverse engineered SQL test framework for all modules
         run 'python runtests.py --exclude resql'

- Execute ui selenium tests in parallel using selenoid(selenium grid + docker)
    Example 1) Execute only all feature tests in parallel mode
     run 'python runtests.py --pkg feature_tests --parallel'

     Example 1) Execute particular module feature tests in parallel mode
     run 'python runtests.py --pkg feature_tests --modules browser_tool_bar_test
                --parallel'



Code Coverage:
---------------

- Test framework is able to calculate the code coverage.
- Coverage package(coverage) is added in $PGADMIN4_SRC/web/regression/requirements.txt file

How to generate code coverage report for API test-suite?
-------------------------------------

- Change to the regression test directory:
    run 'cd $PGADMIN4_SRC/web/regression'

- Before running code coverage we need to configure 'regression/.coveragerc' file.
   i). Create 'regression/.coveragerc' file.
   ii). Copy content of 'regression/.coveragerc.in' to 'regression/.coveragerc'
   iii). Modify 'regression/.coveragerc' file as per our need as 'regression/.coveragerc.in' has default configurations

        In 'regression/.coveragerc' file we need to mention some parameters
        like 'source'(project path),'include'(files/modules to be included for
        coverage),'omit'(files/modules to be omitted from coverage)

        We can also add more parameters according to our need.
        For more info please read coverage.py's official document here
        'http://coverage.readthedocs.io/en/coverage-4.2/install.html'

- Run coverage
    With all modules
        run `coverage run ./runtests.py --exclude feature_tests`
    With specific module
        run `coverage run ./runtests.py --exclude feature_tests --pkg browser.server_groups.servers.tests`

- After execution of coverage, you can run the following to see the code coverage report:
    Normal report:
        run `coverage report`
    HTML report:
        run `coverage html`
        This will create a directory 'htmlcov'. Open 'index.html' file in browser and you will see detail coverage report.

Javascript Tests:

- Install node.js and yarn, in the appropriate way for your platform. On macOS with Homebrew you might use:

    brew install nodejs
    brew install yarn

    Whilst with MacPorts:

    sudo port install nodejs7 yarn

- See also the top-level pgadmin/README : Bundling Javascript

- Javascript tests must be run from the web directory (since that is where node_modules and jest.config.js reside):

    cd web/

- Install the JS modules required for testing:

    yarn install

- Now run the tests:

   yarn run test:js
   yarn run test:js-once
