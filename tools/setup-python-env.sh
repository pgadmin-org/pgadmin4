#!/usr/bin/env sh

TEST=0
if [ "$1" = "--test" ];
then
  TEST=1
fi

echo Creating a blank environment...
python3 -m venv --system-site-packages venv || { echo 'ERROR: Failed to create the blank virtual env.' ; exit 1; }

echo Activating the virtual environment...
. venv/bin/activate || { echo 'ERROR: Failed to activate the virtual env.' ; exit 1; }

echo Installing requirements...
pip install --upgrade pip

if [ ${TEST} -eq 1 ];
then
  echo Installing requirements for running Python tests...
  pip install --force-reinstall --no-cache-dir wheel sphinx==9.0.0 sphinxcontrib-youtube -r web/regression/requirements.txt || { echo 'ERROR: Failed to install Python requirements.' ; exit 1; }
else
  echo Installing requirements for executing and building only...
  pip install --force-reinstall --no-cache-dir wheel sphinx==9.0.0 sphinxcontrib-youtube -r requirements.txt || { echo 'ERROR: Failed to install Python requirements.' ; exit 1; }
fi
