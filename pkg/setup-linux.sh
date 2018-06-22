#!/usr/bin/env bash

# This script currently supports:
# Ubuntu 18.04
#
# Must be run as root!

# Install various dependencies
sudo apt install -y apt-transport-https curl fakeroot wget python3.6 python3-pip libpq5 libpq-dev git nodejs

# Install Yarn
sudo apt remove -y cmdtest
curl -sS https://dl.yarnpkg.com/debian/pubkey.gpg | sudo apt-key add -
echo "deb https://dl.yarnpkg.com/debian/ stable main" | sudo tee /etc/apt/sources.list.d/yarn.list
sudo apt-get update && sudo apt install -y yarn

# Install libpng12
TEMP_DEB="$(mktemp)" &&
wget -O "$TEMP_DEB" 'http://mirrors.kernel.org/ubuntu/pool/main/libp/libpng/libpng12-0_1.2.54-1ubuntu1_amd64.deb' &&
sudo dpkg -i "$TEMP_DEB"
rm -f "$TEMP_DEB"
