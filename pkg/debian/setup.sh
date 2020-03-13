#!/bin/bash

if [ "$EUID" -ne 0 ]
  then echo "This script must be run as root"
  exit 1
fi

echo "Installing system pre-requisites..."
apt install -y curl apt-transport-https ca-certificates

echo "Removing yarn (which may not be the package we expect)..."
dpkg -r yarn

# Node repo
echo "Setting up the NodeJS repo..."
curl -sL https://deb.nodesource.com/setup_10.x | bash -

# Yarn repo
echo "Setting up the Yarn repo..."
curl -sS https://dl.yarnpkg.com/debian/pubkey.gpg | apt-key add -
echo "deb https://dl.yarnpkg.com/debian/ stable main" | tee /etc/apt/sources.list.d/yarn.list

echo "Running apt update..."
apt update

# Install pre-reqs
echo "Installing build pre-requisites..."
apt install -y build-essential python3-dev python3-venv python3-sphinx libpq-dev libffi-dev qt5-default nodejs yarn

