#!/bin/bash

if [ "$EUID" -ne 0 ]
  then echo "This script must be run as root"
  exit 1
fi

OS_VERSION=$(cat /etc/os-release | grep "^VERSION_ID=" | awk -F "=" '{ print $2 }' | sed 's/"//g')

# EPEL & other repos
yum install -y https://dl.fedoraproject.org/pub/epel/epel-release-latest-${OS_VERSION}.noarch.rpm
yum config-manager --enable PowerTools AppStream BaseOS *epel

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
    yum install -y fakeroot httpd-devel qt5-qtbase-devel postgresql-devel python3-devel nodejs yarn rpm-build
    pip3 install sphinx
else
    yum install -y fakeroot qt5-qtbase-devel libpq-devel python3-devel python3-sphinx nodejs yarn rpm-build
fi





