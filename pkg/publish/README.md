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
| `sync-ftp-to-s3.py` | Copy the download tree to the archive bucket, build its indexes and invalidate the CDN |
| `purge-pgadmin-releases.sh` | Delete superseded releases from the download tree and from both repositories |
| `README.apt.in`, `README.yum.in` | The prose those READMEs are built from |
| `aptftp.conf` | `apt-ftparchive` settings: Origin, Label, Suite, Description |
| `CURRENT_MAINTAINER` | The marker the PostgreSQL mirror network expects in each published directory |
| `pga-publish` | The forced-command wrapper |
| `authorized_keys.staging`, `authorized_keys.download` | Annotated templates |
| `selftest.sh` | Exercises the wrapper's parser without touching anything |

All five scripts work standalone. Rebuilding a repository by hand after
purging old releases is what `rebuild-apt-repo.sh bookworm` has always been
for, and that has not changed; the wrapper calls the same script rather than
carrying its own copy of the logic.

`sync-ftp-to-s3.py` and `purge-pgadmin-releases.sh` used to live in the
`pgadmin-org/pgaweb` checkout under `tools/`, which was never really where
they belonged: neither of them touches Django, the site database or Varnish,
and both work on the download tree at `/var/ftp/pgadmin4`, so they are part of
publishing rather than part of the website. They have moved here, and the
wrapper's `sync-s3` verb now runs the copy installed from this directory
rather than the one in the website checkout.

That move has an order to it. The wrapper and the copy of `sync-ftp-to-s3.py`
that it names must both be installed on the download server before the pgaweb
side deletes its own copy, because until the new wrapper is in place the one
running there is still looking for the script under `/var/www/pgaweb/tools`.
The other three verbs that reach into that directory, `create-release`,
`load-docs` and `purge-cache`, are genuinely website operations and stay
exactly where they are.

`purge-pgadmin-releases.sh` has no verb and is not meant to get one. It is run
by hand, on the download server, by somebody who has decided that a release is
old enough to go; it deletes things, and the whole point of the wrapper is
that a compromised runner cannot delete anything that is already published.
Its default is a dry run, so the shape of the work is to read what it proposes
and then re-run it with `--live`, which is a conversation rather than a
command, and nothing a workflow could sensibly have. Rebuilding the
repositories afterwards is the standalone use of `rebuild-apt-repo.sh` and
`rebuild-yum-repo.sh` described above.

## Installing

On both servers, as root:

```sh
install -d -m 755 /usr/local/lib/pga-publish
install -m 755 rebuild-apt-repo.sh rebuild-yum-repo.sh install-repo-readme.py \
    sync-ftp-to-s3.py purge-pgadmin-releases.sh \
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
templates: substitute the public keys, and read the annotations before changing
an option, since each is there for a reason that is easier to write down than
to rediscover.

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

## What the wrapper will not do, however it is asked

Neither key can give you a shell, but a key meant only to add something can
still do damage if the verbs behind it will quietly change something that is
already published. Three of them will not.

**Publication is single-shot, over the whole promotion rather than over its
first verb.** `release-create` has always refused to make a `v<VERSION>` that
exists, but `release-fetch` used to move a staging build's files over the
contents of a release published months ago, and `autoupdate-publish` and
`sync-s3` would then carry the replacements to the auto-updater and into the
archive bucket, which has no `--delete` and so no undo. It now refuses before
moving anything if the release directory holds more than the maintainer
markers `release-create` left, and refuses each individual file whose
destination already exists. A release that needs correcting gets a new
version, never a repair applied to the old one.

**A live package is never replaced.** `packages-fetch` pulls with
`--ignore-existing`, so a staging build carrying a filename that is already
published leaves the published bytes where they are rather than handing the
rebuild something else to sign, and it names what it skipped rather than
passing over it: during a genuine promotion, a collision means two builds have
produced one filename and somebody needs to know which of them the mirrors
have.

**Snapshot retention is counted in days, not in directories.** Keeping the
newest five directories sounds equivalent, and is not, because a directory is
something either key can create: `snapshot-create` makes one with the
publishing key, and an upload under a name of its own choosing makes one with
the upload key, since rrsync confines where a path lands but has nothing to
say about what it is called. Five directories dated today with high suffixes
filled the keep set and every real snapshot fell off the end of it. Keeping
the newest five *dates* cannot be steered that way, because the newest date
anybody can produce is today and today is kept however many directories carry
it. The price, and it is the intended one rather than an accident, is that a
day which built four times keeps all four.

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
