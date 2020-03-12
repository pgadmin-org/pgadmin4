#!/bin/bash

sudo apt install curl

# Yarn repo
curl -sS https://dl.yarnpkg.com/debian/pubkey.gpg | sudo apt-key add -
echo "deb https://dl.yarnpkg.com/debian/ stable main" | sudo tee /etc/apt/sources.list.d/yarn.list

sudo apt update

# Install pre-reqs
echo Installing pre-requisites...
sudo apt install -y build-essential python3-dev python3-venv python3-sphinx libpq-dev qt5-default yarn


