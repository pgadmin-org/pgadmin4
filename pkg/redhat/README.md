# pgAdmin Redhat Builds

This directory contains the build runner script for creating .RPM packages for
Redhat distributions. 

## Supported platforms

* Fedora 30, 31 & 32
* RHEL/CentOS 7 & 8

## Build configuration

To build RPM packages, first run the setup.sh script as root to install the 
required pre-requisites, e.g.

    # pkg/redhat/setup.sh

# Building packages

To build a set of packages, from the top-level source directory run:

    $ make redhat

or

    $ pkg/redhat/build.sh

Four (or five) .rpm packages will be created in the dist/ directory:

*pgadmin4-<version>.<distro>_noarch.rpm*

A convenience package that depends on all the others.

*pgadmin4-server-<version>.<distro>.<arch>.rpm*

The core server, e.g. the Python and JS code and the online documentation.

*pgadmin4-desktop-<version>.<distro>.<arch>.rpm*

The desktop runtime. Requires the server package.

*pgadmin4-web-<version>.<distro>.<arch>.rpm*

The server mode setup script for configuring Apache HTTPD. Requires the server 
package.

*pgadmin4-python3-mod_wsgi-4.7.1-2.el7.<arch>.rpm*

The Python 3 build of mod_wsgi for the Apache HTTPD server. Only built on 
RHEL/CentOS 7.

## Signing Packages

It is good practice to sign RPMs to prove their provenance. The build scripts
included in this directory do NOT do that; doing so is done using a Jenkins
task in the pgAdmin buildfarm.

If you want to sign your own RPMs, you'll first need to ensure that the
*gnupg2* and *rpmsign* tools are available on your system.

Then, create a *.rpmmacros* file in the home directory of the user account that
will be doing the signing. On Fedora 30 and later, and RHEL/CentOS 8 and later,
that should contain the following contents (without the start/end markers).
Replace <your signing key> with the email address in your key:

    %_signature gpg
    %_gpg_path ~/.gnupg
    %_gpg_name <your signing key>
    %_gpgbin /usr/bin/gpg2
    %__gpg_sign_cmd %{__gpg} gpg --force-v3-sigs --batch --verbose --no-armor --no-secmem-warning -u "%{_gpg_name}" -sbo %{__signature_filename} --digest-algo sha256 %{__plaintext_filename}

On RHEL/CentOS 7, the .rpmmacros file should look like this:

    %_signature gpg
    %_gpg_path ~/.gnupg
    %_gpg_name Package Manager
    %_gpgbin /usr/bin/gpg2
    %__gpg_sign_cmd %{__gpg} gpg --force-v3-sigs --batch --verbose --no-armor --passphrase-fd 3 --no-secmem-warning -u "%{_gpg_name}" -sbo %{__
    signature_filename} --digest-algo sha256 %{__plaintext_filename}

Note that these configurations are designed for automated signing in a CI/CD
system. You may need to adjust them to handle passphrases on keys in your own
environment.

You also need to import your signing private key into the gnupg2 keystore, for
example:

    gpg --import signing_key.priv

Once everything is setup, RPMs can be signed easily; for example:

    rpmsign --addsign dist/*.rpm

## Building a repo

A Yum repo can be created by building RPMs for the required platforms, moving
them into the required directory structure, and then running the *createrepo* 
tool over that directory. The pgAdmin repos use the following structure:

    <root>
      redhat/
        rhel-7-x86_64/
          pgadmin4-4.21-1.el7.noarch.rpm
          pgadmin4-desktop-4.21-1.el7.x86_64.rpm
          pgadmin4-python3-mod_wsgi-4.7.1-2.el7.x86_64.rpm
          pgadmin4-server-4.21-1.el7.x86_64.rpm
          pgadmin4-web-4.21-1.el7.noarch.rpm
        rhel-8-x86_64/
          <...>
      fedora/
        <...>
      pgadmin4-fedora-repo-1-1.noarch.rpm
      pgadmin4-redhat-repo-1-1.noarch.rpm
      README

Note that only the first branches are shown above; other branches (e.g. for
Fedora and RHEL 8 follow the structure shown for RHEL 7.

Technically there are multiple different repos, one for each platform and
architecture. The metadata can be created for each as follows:

    /usr/bin/createrepo <root>/redhat/rhel-7-x86_64
    /usr/bin/createrepo <root>/redhat/rhel-8-x86_64
    ...

## Repository RPMs

A script is provided for the creation of repo RPMs. It will create RPMs that
install the required Yum configuration file and the public signing key for
pgAdmin (you may want to replace the contents of *PGADMIN_PKG_KEY* with your own
public key):

    ./repo-rpms.sh

Set the *PGADMIN_REPO_DIR* environment variable to define the repository root
from the client's perspective. Given the example above, you might do:

    PGADMIN_REPO_DIR=https://yum.company.com/repos/<root> ./repo-rpms.sh
