.. _submitting_pull_requests:

*********************************
`Submitting Pull Requests`:index:
*********************************

Before developing a feature or bug fix for pgAdmin you should always contact
the developers on the mailing list pgadmin-hackers@postgresql.org to discuss
your plans. This ensures that others know what you are doing and can then
avoid duplicating your work, and in the case of large changes, gives the
community the chance to discuss and refine your ideas before investing too
much time writing code that may later be rejected.

You should always develop changes against a checkout of the source code from
the GIT source code repository, and not a release tarball. This ensures that
you're working with the latest code on the branch and makes it easier to
generate Pull Requests correctly.

As of September 2022, the pgAdmin source repository can found at
https://github.com/pgadmin-org/pgadmin4. A typical workflow for a relatively
simple change might look as follows:

1. Visit the pgAdmin 4 project on GitHub, and click the *Fork* button to create
   your own development repository in your GitHub account.

2.  Checkout a local copy of the source code with a command like:

   .. code-block:: bash

      $ git clone https://github.com/<your GitHub username>/pgadmin4.git

3. Develop and test your change in your local development environment.

4. Review your changes and check them thoroughly to ensure they meet the
   pgAdmin :doc:`coding_standards`, and review them against the
   :doc:`code_review` to minimise the chances of them being rejected.

5. Once you're happy with your change, commit it with a suitable message.
   Include a one-line summary at the top, and if appropriate, further
   paragraphs following a blank line after the summary.

6. Push your changes to your fork of the repository.

7. Back in GitHub, create a new Pull Request against the *pgadmin-org/pgadmin4*
   *master* branch.

   .. note::
      Each Pull Request should encompass a single bug fix or feature as a single
      commit. If necessary, you should squash multiple commits for larger changes
      or features into a single commit before submitting.

8. Your Pull Request will be reviewed by one or more members of the development
   team and either accepted or sent back with requested changes. In some cases
   it may be rejected if the change is not considered appropriate - this is
   why it's important to discuss your work with the team before spending any
   significant time on it.

For more complex changes, you may wish to use a *Feature Branch* in your fork
of the pgAdmin repository, and use that to create the Pull Request.

.. note::
   This is a simple example of a workflow. You may choose to use other
   tools such as the `GitHub CLI <https://cli.github.com>`_ instead; documenting
   such tools and workflows is outside the scope of the pgAdmin documentation
   however.
