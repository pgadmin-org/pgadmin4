#!/bin/sh

BUNDLE="$1"

if ! test -d "${BUNDLE}" ; then
	echo "${BUNDLE} is no bundle!" >&2
	exit 1
fi

# Get the config
source codesign.conf

SCRIPT_DIR=`pwd`

echo Reorganising the framework structure

# Create "Current" and "Current/Resources" inside each of the framework dirs
MYDIR=`pwd`
find "${BUNDLE}/Contents/Frameworks"/*framework -type d -name "Versions" | while read -r myVar; do
  cd "${myVar}"

  # Create framework 'Current' soft link
  VERSION_NUMBER=`ls -1`
  ln -s $VERSION_NUMBER Current

  # Create "Resources" subdirectory
  if [ ! -d Current/Resources ]; then
    mkdir Current/Resources
  fi

  cd "${MYDIR}"
done

# Stuff for Qt framework files only
find "${BUNDLE}/Contents/Frameworks" -type d -name "Qt*framework" | while read -r myVar; do
  cd "${myVar}"

  # Create soft link to the framework binary
  ln -s Versions/Current/Qt*

  # Create soft link to the framework Resources dir
  ln -s Versions/Current/Resources

  # Create the Info.plist files
  MYNAME=`ls -1 Qt*`
  sed 's/__SHORT_VERSION__/${QT_SHORT_VERSION}/' "${SCRIPT_DIR}/Info.plist-template_Qt5" | sed 's/__FULL_VERSION__/${QT_FULL_VERSION}/' | sed "s/__FRAMEWORK_NAME__/${MYNAME}/" > "Resources/Info.plist"

  cd "${MYDIR}"
done

# Same thing, but specific to the Python framework dir
find "${BUNDLE}/Contents/Frameworks" -type d -name "P*framework" | while read -r myVar; do
  cd "${myVar}"

  # Create soft link to the framework binary
  ln -s Versions/Current/Py*

  # Create soft link to the framework Resources dir
  ln -s Versions/Current/Resources

  # Create the Info.plist file
  MYNAME=`ls -1 Py*`
  sed 's/__SHORT_VERSION__/${PYTHON_SHORT_VERSION}/' "${SCRIPT_DIR}/Info.plist-template_Python" | sed 's/__FULL_VERSION__/${PYTHON_FULL_VERSION}/' | sed "s/__FRAMEWORK_NAME__/${MYNAME}/" > "Resources/Info.plist"

  cd "${MYDIR}"
done

# Sign the .app
echo Signing ${BUNDLE}
codesign --sign "${DEVELOPER_ID}" --verbose --deep --force "${BUNDLE}"

# Verify it worked
echo Verifying the signature
codesign --verify --verbose --deep --force "${BUNDLE}"
RETURN_STATUS=$?
if [ $RETURN_STATUS -ne 0 ]; then
  echo Code signing did not work, check the log
  exit 1
else
  echo ${BUNDLE} successfully signed
fi
