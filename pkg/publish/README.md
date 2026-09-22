# Publishing

Everything that puts a pgAdmin build in front of a user lives here: the scripts
that index and sign the APT and YUM repositories, the README that sits at the
top of each of them, and the wrapper that lets a GitHub Actions runner ask for
those things to happen without being given a shell on the servers.

Two servers are involved, and which one a build goes to depends on what kind
of build it is. The *staging* server holds release candidates at
`/var/www/html/builds/<date>` and serves them over HTTP for testing, until they
are promoted and copied across. The *download* server holds the published tree
at `/var/ftp/pgadmin4`, which the world mirrors, and it is also where nightly
snapshots go directly, under `snapshots/<date>`: snapshots are not staged and
promoted, they are simply published somewhere nobody mirrors.

That last point is why the snapshots tree is the confinement root for the
upload key on the download server. It is the one part of the download site
that `sync-ftp-to-s3.py` excludes, so nothing written through that key can
reach the archive bucket or the PostgreSQL mirrors.

Each server runs the same wrapper with a different role, and the role decides
which verbs exist.

## Files

| File | What it is |
| --- | --- |
| `rebuild-apt-repo.sh` | Index and sign one APT tree |
| `rebuild-yum-repo.sh` | Index and sign one YUM tree, and make the EL compatibility links |
| `install-repo-readme.py` | Write the README at the top of an APT or YUM tree |
| `README.apt.in`, `README.yum.in` | The prose those READMEs are built from |
| `aptftp.conf` | `apt-ftparchive` settings: Origin, Label, Suite, Description |
| `CURRENT_MAINTAINER` | The marker the PostgreSQL mirror network expects in each published directory |
| `pga-publish` | The forced-command wrapper |
| `authorized_keys.staging`, `authorized_keys.download` | Annotated templates |
| `selftest.sh` | Exercises the wrapper's parser without touching anything |

The three scripts work standalone. Rebuilding a repository by hand after
purging old releases is what `rebuild-apt-repo.sh bookworm` has always been
for, and that has not changed; the wrapper calls the same script rather than
carrying its own copy of the logic.

## Installing

On both servers, as root:

```sh
install -d -m 755 /usr/local/lib/pga-publish
install -m 755 rebuild-apt-repo.sh rebuild-yum-repo.sh install-repo-readme.py \
    /usr/local/lib/pga-publish/
install -m 644 aptftp.conf README.apt.in README.yum.in CURRENT_MAINTAINER \
    /usr/local/lib/pga-publish/
install -m 755 pga-publish /usr/local/sbin/pga-publish
```

Then the role, which the wrapper refuses to start without, since defaulting it
would mean a misconfigured host quietly accepting the other one's verbs:

```sh
echo staging  > /etc/pga-publish.role     # on the staging server
echo download > /etc/pga-publish.role     # on the download server
```

On the download server only, the CloudFront distribution that `sync-s3`
invalidates. It is an identifier rather than a credential, but it is site
configuration, so it lives here rather than in the source tree:

```sh
echo '<distribution id>' > /etc/pga-publish.cloudfront
```

And the staging server it pulls from during a release, which is site
configuration rather than code, and is deliberately not something the caller
can name:

```sh
echo '<staging server>' > /etc/pga-publish.pull-host
```

`aptftp.conf` is installed with the scripts above rather than kept in
`~pgaupload`, which is where it lived before this: it is an input to what gets
indexed and therefore to what gets signed, and nothing needs the publishing
account to be able to write it.

## Access

Three key pairs. A publishing key and an upload key belong to the runner; a
pull key belongs to the download server, which uses it to fetch staged content
from the staging server during publication. The pull key's private half must be
at `~pgaupload/.ssh/pga-pull` on the download server, which is where
`pga-publish` looks for it; the name in the key management system is only a
label, and the path is what matters.

`authorized_keys.staging` and `authorized_keys.download` are annotated
templates: substitute the addresses and the public keys, and read the
annotations before changing an option, since each is there for a reason that is
easier to write down than to rediscover.

The runner's two private keys live on its own filesystem, and the workflows
reference them by path, taken from the `PUBLISH_SSH_KEY` and `UPLOAD_SSH_KEY`
repository variables, rather than carrying copies in GitHub's secret store:
they are already on the machine, and a second copy would mean a second place to
rotate and a second place to leak from. The runner also needs the two servers in its `~/.ssh/known_hosts`,
since host key checking is on and there is nobody to answer a prompt.

The trade-off is that the boundary moves. An environment secret is gated by a
deployment branch policy; a file on disk is gated by which workflows may run on
that machine. This repository is public, so the runner belongs in a runner
group restricted to these workflows, and nothing triggered by `pull_request`
should target it.

The shape of it is that no key gets a shell. The publishing key runs
`pga-publish`, which parses `SSH_ORIGINAL_COMMAND` itself and never passes it
to one. The upload key runs `rrsync`, confined to the staging root,
write-only, with deletion and symlink-following refused. `restrict` turns off
everything optional, PTY allocation included, and keeps doing so as OpenSSH
grows new options.

## Checking it

```sh
./selftest.sh                       # 70 cases, touches nothing
pga-publish --dry-run --role download rebuild-apt bookworm
```

`--dry-run` prints the argument vector each step would have run instead of
running it, and is only honoured when `SSH_ORIGINAL_COMMAND` is unset, so a
client cannot reach it.

## What signs what, and where

The GPG key that signs packages and repository metadata stays on the servers.
A workflow uploads unsigned artefacts and asks for `stage-sign`, so a
compromised run can ask for a signature over something it has just uploaded,
but never holds the key, signs out of band, or signs with a different one.

Be clear about how wide that is, because it is wider than "the packages it
just built". The signing verbs select by file extension across the tree, so
anything ending `.tar.gz`, `.whl`, `.pdf` or `.epub` gets a detached armoured
signature, and every `.rpm` under `yum/` is re-signed. The content is
arbitrary, and a detached signature carries no context tying it to pgAdmin, so
a signature obtained this way can be presented anywhere alongside the file it
covers. Selecting by name instead would not change this: an attacker who can
write to the tree can name a file whatever a filter expects. What actually
bounds it is where the upload key can write, which on the download server is
the snapshots tree alone, and on the staging server a build directory that
nothing publishes without a promotion. Treat write access to either as
equivalent to a signing oracle, and rotate the key if one is suspected.

The exceptions are the macOS notarisation and the Windows Authenticode
signature, which happen on the runners because the Apple credentials and the
Certum token cannot follow the GPG key onto these machines.
