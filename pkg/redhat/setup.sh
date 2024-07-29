#!/bin/bash

if [ "$EUID" -ne 0 ]
  then echo "This script must be run as root"
  exit 1
fi

OS_VERSION=$(grep "^VERSION_ID=" /etc/os-release | awk -F "=" '{ print $2 }' | sed 's/"//g' | awk -F "." '{ print $1 }')

# EPEL & other repos
if [ "${OS_VERSION}" != "9" ]; then
    yum -y install centos-release-scl
fi

yum install -y "https://dl.fedoraproject.org/pub/epel/epel-release-latest-${OS_VERSION}.noarch.rpm"
if [ "${OS_VERSION}" == "8" ] || [ "${OS_VERSION}" == "9" ]; then
    yum config-manager --enable PowerTools AppStream BaseOS "*epel"
    dnf -qy module disable postgresql
fi

# PostgreSQL repo
if [ "${OS_VERSION}" == "8" ] || [ "${OS_VERSION}" == "9" ]; then
    yum install -y "https://download.postgresql.org/pub/repos/yum/reporpms/EL-${OS_VERSION}-x86_64/pgdg-redhat-repo-latest.noarch.rpm"
else
    yum install -y "https://download.postgresql.org/pub/repos/yum/reporpms/F-${OS_VERSION}-x86_64/pgdg-fedora-repo-latest.noarch.rpm"
fi

# Node repo
echo "Setting up the NodeJS repo..."
curl -sL https://rpm.nodesource.com/setup_16.x | bash -

# Yarn repo
echo "Setting up the Yarn repo..."
curl --silent --location https://dl.yarnpkg.com/rpm/yarn.repo | sudo tee /etc/yum.repos.d/yarn.repo

# Install pre-reqs
echo "Installing build pre-requisites..."
yum groupinstall -y "Development Tools"

if [ "${OS_VERSION}" == "8" ]; then
    yum install -y expect fakeroot postgresql15-devel python3.9-devel nodejs yarn rpm-build rpm-sign yum-utils krb5-devel
    pip3.9 install sphinx==7.4.7
    pip3.9 install sphinxcontrib-youtube
elif [ "${OS_VERSION}" == "9" ]; then
    yum install -y expect libpq5-devel postgresql15-devel python3-devel nodejs yarn rpm-build rpm-sign yum-utils krb5-devel
    pip3 install sphinx==7.4.7
    pip3 install sphinxcontrib-youtube
else
    yum install -y expect fakeroot postgresql15-devel python3-devel nodejs yarn rpm-build rpm-sign yum-utils krb5-devel
    pip3 install sphinx==7.4.7
    pip3 install sphinxcontrib-youtube
fi

# Setup RPM macros for signing
echo "Please add the following macros to ~/.rpmmacros for the user that will sign the RPMs if required:"
echo
    cat << EOF
# Macros for signing RPMs.

%_signature gpg
%_gpg_path ~/.gnupg
%_gpg_name <your signing key>
%_gpgbin /usr/bin/gpg2
%__gpg_sign_cmd %{__gpg} gpg --force-v3-sigs --batch --verbose --no-armor --no-secmem-warning -u "%{_gpg_name}" -sbo %{__signature_filename
} --digest-algo sha256 %{__plaintext_filename}
EOF

echo
