﻿function New-TemporaryDirectory {
    $parent = [System.IO.Path]::GetTempPath()
    $name = [System.IO.Path]::GetRandomFileName()
    New-Item -ItemType Directory -Path (Join-Path $parent $name)
}

$dir  = pwd
$full_folder_tempdir = New-TemporaryDirectory
$tempdir = "P:"
subst $tempdir /D
subst $tempdir $full_folder_tempdir
cd P:\

echo "## Copying Electron Folder to the temporary directory..."
cp -Recurse -force $dir\electron .

pushd .\electron
    echo "## Copying pgAdmin folder to the temporary directory..."
    Remove-Item -Recurse -ErrorAction Ignore web
    cp -Recurse -force $dir\web .

    echo "## Creating Virtual Environment..."
    Remove-Item -Recurse -ErrorAction Ignore venv
    mkdir venv
	python -m virtualenv venv
	cp venv\Scripts\python.exe venv\
	cp venv\Scripts\pythonw.exe venv\
	cp C:\Windows\System32\python27.dll venv\
	cp -Recurse -force C:\Python27\DLLs venv\
	cp -Recurse -force C:\Python27\Lib\* venv\Lib\
    # virtualenv.exe venv
    . .\venv\Scripts\activate
    python -m pip install -r $dir\requirements.txt

    echo "## Compiling web folder"
    pushd web
	 Remove-Item -Recurse -ErrorAction Ignore node_modules
     yarn bundle-app-js
    popd
    yarn install
    yarn dist:windows
popd

rm ${dir}/electron/out/make/*.exe
mkdir ${dir}/electron/out/make
mv ${tempdir}/electron/out/make/squirrel.windows/x64/*.exe ${dir}/electron/out/make

cd $dir

subst $tempdir /D
