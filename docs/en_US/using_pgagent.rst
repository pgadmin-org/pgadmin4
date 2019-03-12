.. _using_pgagent:


**********************
`Using pgAgent`:index:
**********************

pgAgent is a scheduling agent that runs and manages jobs; each job consists of
one or more steps and schedules.  If two or more jobs are scheduled to execute
concurrently, pgAgent will execute the jobs in parallel (each with it's own
thread).

A step may be a series of SQL statements or an operating system batch/shell
script. Each step in a given job is executed when the previous step completes,
in alphanumeric order by name.  Switches on the *pgAgent Job* dialog (accessed
through the *Properties* context menu) allow you to modify a job, enabling or
disabling individual steps as needed.

Each job is executed according to one or more schedules. Each time the job or
any of its schedules are altered, the next runtime of the job is re-calculated.
Each instance of pgAgent periodically polls the database for jobs with the next
runtime value in the past. By polling at least once every minute, all jobs will
normally start within one minute of the specified start time. If no pgAgent
instance is running at the next runtime of a job, it will run as soon as pgAgent
is next started, following which it will return to the normal schedule.

When you highlight the name of a defined job in the pgAdmin tree control, the
*Properties* tab of the main pgAdmin window will display details about the job,
and the *Statistics* tab will display details about the job's execution.

Security Concerns
*****************

pgAgent is a very powerful tool, but does have some security considerations that
you should be aware of:

**Database password** - *DO NOT* be tempted to include a password in the pgAgent
connection string - on Unix systems it may be visible to all users in *ps*
output, and on Windows systems it will be stored in the registry in plain text.
Instead, use a libpq *~/.pgpass* file to store the passwords for every database
that pgAgent must access. Details of this technique may be found in the
`PostgreSQL documentation on .pgpass file <https://www.postgresql.org/docs/current/libpq-pgpass.html>`_.

**System/database access** - all jobs run by pgAgent will run with the security
privileges of the pgAgent user. SQL steps will run as the user that pgAgent
connects to the database as, and batch/shell scripts will run as the operating
system user that the pgAgent service or daemon is running under.  Because of
this, it is essential to maintain control over the users that are able to create
and modify jobs. By default, only the user that created the pgAgent database
objects will be able to do this - this will normally be the PostgreSQL
superuser.

