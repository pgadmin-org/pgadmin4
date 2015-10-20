pgAdmin 4
=========

.. image:: images/logo-right-128.png
    :align: right
    :alt: pgAdmin Logo
    
Welcome to pgAdmin 4. pgAdmin is the leading Open Source management tool for 
PostgreSQL, the world's most advanced Open Source database.

pgAdmin 4 is built on the experiences learnt over two decades of developing it's 
predecessors, pgAdmin, pgAdmin II and pgAdmin III. Its designed to meet the 
needs of both novice and experienced PostgreSQL users alike.

********
Features
********

pgAdmin is designed to allow users to manage and develop multiple Postgres 
databases at once. It may be run either as a web application in which case it 
supports multiple users, each with their own settings, or as a desktop 
application for individual users.

The main application environment centres around a tree control on the left hand
side. Users register one or more Postgres servers in the application which are 
displayed in groups on the treeview. Through opening a server, the user is 
connected to the selected database server and the tree is populated with high 
level objects, under the server node, including databases, roles and 
tablespaces. The user is then able to open a database node to see the schemas 
within that database, and a schema node to see the tables and other objects in
that schema and so on.

Selecting a node in the tree will cause its Properties to be displayed in the 
tab set to the right of the display. Additional tabs may be selected to view 
statistics about the selected object, or lists of objects on which the selected 
object is dependent on, or that are dependent upon the selected object. A 
dashboard tab is also present which may be used to view high-level information 
about the server that the selected object is on, such as the current sessions 
and lock information.

Right-clicking a node on the tree will display a context sensistive menu giving 
options for different operations that may be executed on the object the node 
represents.

A third panel is show below the tabset. For any object within the database, 
this will display the SQL that may be used to create or drop the object.

Other features include a tool for developing executing arbitrary SQL queries and
visually editing the results (where possible), and debugger for pl/pgsql 
function development, and various tools for performing routine and bulk database
maintenance activities.

Please see the appropriate documentation sections for details on the usage of 
individual features.

.. toctree::
   :maxdepth: 2
   
   browser
   debugger
   query-tool

***********
Development
***********

pgAdmin is an Open Source project and accepts code contributions from anyone, 
provided they implement desirable features and are written to the required 
standard. Please read the development sections of the documentation carefully to
learn how pgAdmin works, and how to develop improvements and new features.

.. toctree::
   :maxdepth: 2
   
   coding-standards
   code-overview
   code-snippet
   submitting-patches
   translations

*******
Website
*******

The pgAdmin website can be found at `here <http://www.pgadmin.org>`_, and 
downloads are hosted on the 
`PostgreSQL Website <http://www.postgresql.org/download>`_.

*******
Licence
*******

pgAdmin is released under the 
`PostgreSQL Licence <http://www.postgresql.org/about/licence>`_, which is a 
liberal Open Source licence similar to BSD or MIT, and approved by the Open 
Source Initiative. The copyright for the project source code, website and 
documentation is attributed to the 
`pgAdmin Development Team <http://www.pgadmin.org/development/team.php>`_.
