#!/bin/sh

BUNDLE="$1"

if ! test -d "${BUNDLE}" ; then
	echo "${BUNDLE} is no bundle!" >&2
	exit 1
fi

# Get the config
source framework.conf

SCRIPT_DIR=`pwd`

echo Reorganising the framework structure

# Create "Current" and "Current/Resources" inside each of the framework dirs
MYDIR=`pwd`
find "${BUNDLE}/Contents/Frameworks"/*framework -type d -name "Versions" | while read -r framework_dir; do
  cd "${framework_dir}"

  # Create framework 'Current' soft link
  VERSION_NUMBER=`ls -1`
  ln -s $VERSION_NUMBER Current || { echo "link creation in framework-config.sh failed"; exit 1; }

  # Create "Resources" subdirectory
  if [ ! -d Current/Resources ]; then
    mkdir Current/Resources
  fi

  cd "${MYDIR}"
done

# Stuff for Qt framework files only
find "${BUNDLE}/Contents/Frameworks" -type d -name "Qt*framework" | while read -r framework_dir; do
  cd "${framework_dir}"

  # Create soft link to the framework binary
  ln -s Versions/Current/Qt* || { echo "link creation in framework-config.sh failed"; exit 1; }

  # Create soft link to the framework Resources dir
  ln -s Versions/Current/Resources || { echo "link creation in framework-config.sh failed"; exit 1; }

  # Create the Info.plist files
  MYNAME=`ls -1 Qt*`
  if [ -f Resources/Info.plist ]; then
    chmod +w Resources/Info.plist
  fi
  sed 's/__SHORT_VERSION__/${QT_SHORT_VERSION}/' "${SCRIPT_DIR}/Info.plist-template_Qt5" | sed 's/__FULL_VERSION__/${QT_FULL_VERSION}/' | sed "s/__FRAMEWORK_NAME__/${MYNAME}/" > "Resources/Info.plist" || { echo "sed replacement in framework-config.sh failed"; exit 1; }

  cd "${MYDIR}"
done

# Same thing, but specific to the Python framework dir
find "${BUNDLE}/Contents/Frameworks" -type d -name "P*framework" | while read -r framework_dir; do
  cd "${framework_dir}"

  # Create soft link to the framework binary
  ln -s Versions/Current/Py* || { echo "link creation in framework-config.sh failed"; exit 1; }

  # Create soft link to the framework Resources dir
  ln -s Versions/Current/Resources || { echo "link creation in framework-config.sh failed"; exit 1; }

  # Create the Info.plist file
  MYNAME=`ls -1 Py*`
  sed 's/__SHORT_VERSION__/${PYTHON_SHORT_VERSION}/' "${SCRIPT_DIR}/Info.plist-template_Python" | sed 's/__FULL_VERSION__/${PYTHON_FULL_VERSION}/' | sed "s/__FRAMEWORK_NAME__/${MYNAME}/" > "Resources/Info.plist" || { echo "sed replacement in framework-config.sh failed"; exit 1; }

  cd "${MYDIR}"
done

echo ${BUNDLE} framework config finished
