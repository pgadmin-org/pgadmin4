.. _submitting_patches:

******************
Submitting Patches
******************

Before developing a patch for pgAdmin you should always contact the developers 
on the mailing list pgadmin-hackers@postgresql.org to discuss your 
plans. This ensures that others know if you're fixing a bug and can then avoid
duplicating your work, and in the case of large patches, gives the community
the chance to discuss and refine your ideas before investing too much time 
writing code that may later be rejected.

You should always develop patches against a checkout of the source code from the
GIT source code repository, and not a release tarball. This ensures that you're 
working with the latest code on the branch and makes it easier to generate
patches correctly. You can checkout the source code with a command like::

    $ git clone git://git.postgresql.org/git/pgadmin4.git
    
Once you've made the changes you wish to make, commit them to a private 
development branch in your local repository. Then create a patch containing the
changes in your development branch against the upstream branch on which your 
work is based. For example, if your current branch contains your changes, you
might run::

    $ git diff origin/master > my_cool_feature.diff

to create a patch between your development branch and the public master branch.

Once you have your patch, check it thoroughly to ensure it meets the pgAdmin
:doc:`coding_standards`, and review it against the :doc:`code_review` to minimise
the chances of it being rejected. Once you're happy with your work, mail it
as an attachment to the mailing list pgadmin-hackers@postgresql.org.
Please ensure you include a full description of what the patch does,
as well as the rationale for any important design decisions.
