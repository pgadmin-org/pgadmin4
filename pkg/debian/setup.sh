#!/bin/bash

if [ "$EUID" -ne 0 ]
  then echo "This script must be run as root"
  exit 1
fi

echo "Running apt update..."
apt update

echo "Installing system pre-requisites..."
apt install -y curl apt-transport-https ca-certificates gnupg

echo "Removing yarn (which may not be the package we expect)..."
dpkg -r yarn

# PostgreSQL
echo "Setting up the PostgreSQL repo..."
curl https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -
sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'

# Node repo
echo "Setting up the NodeJS repo..."
curl -sL https://deb.nodesource.com/setup_12.x | bash -

# Yarn repo
echo "Setting up the Yarn repo..."
curl -sS https://dl.yarnpkg.com/debian/pubkey.gpg | apt-key add -
echo "deb https://dl.yarnpkg.com/debian/ stable main" | tee /etc/apt/sources.list.d/yarn.list

echo "Running apt update..."
apt update

# Install pre-reqs
echo "Installing build pre-requisites..."
apt install -y build-essential python3-dev python3-venv python3-sphinx python3-wheel libpq-dev libffi-dev nodejs yarn libkrb5-dev

