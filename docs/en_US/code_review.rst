.. _code_review:

**************************
`Code Review Notes`:index:
**************************

This document lists a number of standard items that will be checked during the
review process for any changes submitted for inclusion in pgAdmin.

* Ensure all code follows the pgAdmin :doc:`coding_standards`.

* Ensure all code has unit test coverage and API/feature test coverage where
  appropriate.

* Copyright years must be correct and properly formatted (to make it easy to make
  bulk updates every year). The start date should always be 2013, and the end year
  the current year, e.g.

    Copyright (C) 2013 - 2023, The pgAdmin Development Team

* Ensure there's a blank line immediately following any copyright headers.

* Include PyDoc comments for functions, classes and modules. Node modules should
  be """Implements the XXXX node""".

* Ensure that any generated SQL does not have any leading or trailing blank lines
  and consistently uses 4 space indents for nice formatting.

* Don't special-case any Slony objects. pgAdmin 4 will have no direct knowledge
  of Slony, unlike pgAdmin 3.

* If you copy/paste modules, please ensure any comments are properly updated.

* Read all comments, and ensure they make sense and provide useful commentary on
  the code.

* Ensure that field labels both use PostgreSQL parlance, but also are descriptive.
  A good example is the "Init" field on an FTS Template - Init is the PG term, but
  adding the word "Function" after it makes it much more descriptive.

* Re-use code whereever possible, but factor it out into a suitably central
  location - don't copy and paste it unless modifications are required!

* Format code nicely to make it readable. Break up logical chunks of code with
  blank lines, and comment well to describe what different sections of code are
  for or pertain to.

* Ensure that form validation works correctly and is consistent with other
  dialogues in the way errors are displayed.

* On dialogues with Schema or Owner fields, pre-set the default values to the
  current schema/user as appropriate. In general, if there are common or sensible
  default values available, put them in the fields for the user.

* 1 Pull Request == 1 feature. If you need to fix/update existing
  infrastructure in your change, it's usually easier if it's in a separate
  Pull Request. Pull Requests containing multiple new features or unrelated
  changes are likely to be rejected.

* Ensure the change is fully functional, and works! If you wish to send a
  work in progress (WIP) change that is not intended for commit, instead of
  submitting a Pull Request, send either as a link to a repository fork or a
  patch to the pgadmin-hackers@postgresql.org mailing list, clearly stating
  that it's a WIP, and noting what does or does not yet work.
