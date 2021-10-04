#!/bin/bash

if [ "$EUID" -ne 0 ]
  then echo "This script must be run as root"
  exit 1
fi

OS_VERSION=$(cat /etc/os-release | grep "^VERSION_ID=" | awk -F "=" '{ print $2 }' | sed 's/"//g')

# EPEL & other repos
yum -y install centos-release-scl
yum install -y https://dl.fedoraproject.org/pub/epel/epel-release-latest-${OS_VERSION}.noarch.rpm
if [ ${OS_VERSION} == 8 ]; then
    yum config-manager --enable PowerTools AppStream BaseOS *epel
    dnf -qy module disable postgresql
fi

# PostgreSQL repo
if [ ${OS_VERSION} == 7 ] || [ ${OS_VERSION} == 8 ]; then
    yum install -y https://download.postgresql.org/pub/repos/yum/reporpms/EL-${OS_VERSION}-x86_64/pgdg-redhat-repo-latest.noarch.rpm
else
    yum install -y https://download.postgresql.org/pub/repos/yum/reporpms/F-${OS_VERSION}-x86_64/pgdg-fedora-repo-latest.noarch.rpm
fi

# Node repo
echo "Setting up the NodeJS repo..."
curl -sL https://rpm.nodesource.com/setup_12.x | bash -

# Yarn repo
echo "Setting up the Yarn repo..."
curl --silent --location https://dl.yarnpkg.com/rpm/yarn.repo | sudo tee /etc/yum.repos.d/yarn.repo

# Install pre-reqs
echo "Installing build pre-requisites..."
yum groupinstall -y "Development Tools"

if [ ${OS_VERSION} == 7 ]; then
    yum install -y expect fakeroot httpd-devel postgresql14-devel python3-devel nodejs yarn rpm-build rpm-sign yum-utils krb5-devel
    pip3 install sphinx
else
    yum install -y expect fakeroot postgresql14-devel python3-devel python3-sphinx nodejs yarn rpm-build rpm-sign yum-utils krb5-devel
fi

# Setup RPM macros for signing
echo "Please add the following macros to ~/.rpmmacros for the user that will sign the RPMs if required:"
echo
if [ ${OS_VERSION} == 7 ]; then
    cat << EOF
# Macros for signing RPMs.

%_signature gpg
%_gpg_path ~/.gnupg
%_gpg_name Package Manager
%_gpgbin /usr/bin/gpg2
%__gpg_sign_cmd %{__gpg} gpg --force-v3-sigs --batch --verbose --no-armor --passphrase-fd 3 --no-secmem-warning -u "%{_gpg_name}" -sbo %{__
signature_filename} --digest-algo sha256 %{__plaintext_filename}
EOF
else
    cat << EOF
# Macros for signing RPMs.

%_signature gpg
%_gpg_path ~/.gnupg
%_gpg_name <your signing key>
%_gpgbin /usr/bin/gpg2
%__gpg_sign_cmd %{__gpg} gpg --force-v3-sigs --batch --verbose --no-armor --no-secmem-warning -u "%{_gpg_name}" -sbo %{__signature_filename
} --digest-algo sha256 %{__plaintext_filename}
EOF
fi

echo
