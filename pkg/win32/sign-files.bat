@ECHO OFF
REM Sign one or more files with a SHA-256 file digest:
REM
REM     sign-files.bat "<certificate subject>" "file" ["file" ...]
REM
REM Called by Make.bat for the components it signs, and by Inno Setup, through
REM cmd.exe, for the installer and its uninstaller. signtool.exe is taken from
REM PGADMIN_SIGNTOOL_DIR, which Make.bat sets.
REM
REM The one-step "signtool sign /fd sha256" cannot be used. The card's key is
REM reached through Certum's legacy CryptoAPI provider, crypto3 CSP, and for a
REM SHA-2 digest Windows' CMS code first converts that key handle to a CNG one
REM with NCryptTranslateHandle, which only works when a CNG provider is
REM registered under the same name. None is, so signing fails with 0xc0000225
REM before the card is touched. signtool's split flow avoids that conversion:
REM /dg writes the digests without the key, /ds signs them on the card, /di
REM puts the signatures into the files, and the timestamp is added separately
REM because /tr cannot be combined with the split flow. See
REM pkg\win32\SIGNING.md.
REM
REM Only /ds uses the card, and it is one signtool process however many files
REM it signs, so a call to this script costs one PIN prompt.
REM
REM Paths containing ! are not supported, as delayed expansion would eat it.
SETLOCAL EnableDelayedExpansion

SET "SIGNTOOL=%PGADMIN_SIGNTOOL_DIR%\signtool.exe"
IF NOT EXIST "%SIGNTOOL%" (
    ECHO sign-files: signtool.exe not found; is PGADMIN_SIGNTOOL_DIR set?
    EXIT /B 1
)

SET "SUBJECT=%~1"
IF "!SUBJECT!" == "" (
    ECHO sign-files: no certificate subject given
    EXIT /B 1
)
SHIFT

SET "FILES="
:ARGS
IF "%~1" == "" GOTO ARGS_DONE
SET "FILES=!FILES! "%~f1""
SHIFT
GOTO ARGS
:ARGS_DONE
IF "!FILES!" == "" (
    ECHO sign-files: no files given
    EXIT /B 1
)

REM A private working directory per call, so that neither a concurrent run nor
REM one that failed and left its files behind can mix digests with this one.
SET "WORK=%TEMP%\sign-files-%RANDOM%%RANDOM%"
MKDIR "!WORK!" || EXIT /B 1

REM /dg names each digest after the file's name alone, so two files with the
REM same name would overwrite one another's digest and one would be signed
REM with the other's signature. Refuse rather than rely on the callers.
SET "DIGS="
FOR %%f IN (!FILES!) DO (
    IF EXIST "!WORK!\%%~nxf.name" (
        ECHO sign-files: more than one file is named %%~nxf; sign them in separate calls
        GOTO FAIL
    )
    TYPE NUL > "!WORK!\%%~nxf.name"
    SET "DIGS=!DIGS! "!WORK!\%%~nxf.dig""
)

REM /dg needs the signing certificate, but only its public part: exported from
REM the machine store here, since asking certutil for it runs a signature test
REM and so raises a PIN prompt. The match is on the certificate's simple name,
REM and exactly one must match, so a subject that signtool /n would take as a
REM substring of a longer name fails here rather than signing with the wrong
REM certificate.
powershell -NoProfile -NonInteractive -Command "$c = Get-ChildItem Cert:\LocalMachine\My | Where-Object { $_.GetNameInfo('SimpleName', $false) -eq $env:SUBJECT -and $_.HasPrivateKey }; if (@($c).Count -ne 1) { exit 1 }; [IO.File]::WriteAllBytes((Join-Path $env:WORK 'signer.cer'), $c.Export('Cert'))"
IF ERRORLEVEL 1 (
    ECHO sign-files: expected exactly one certificate named "!SUBJECT!" in the machine store
    GOTO FAIL
)

"%SIGNTOOL%" sign /dg "!WORK!" /fd sha256 /f "!WORK!\signer.cer" !FILES! || GOTO FAIL
"%SIGNTOOL%" sign /ds /sm /n "!SUBJECT!" /fd sha256 !DIGS! || GOTO FAIL
"%SIGNTOOL%" sign /di "!WORK!" !FILES! || GOTO FAIL
"%SIGNTOOL%" timestamp /tr http://timestamp.digicert.com /td sha256 !FILES! || GOTO FAIL
"%SIGNTOOL%" verify /pa !FILES! || GOTO FAIL

RMDIR /S /Q "!WORK!"
EXIT /B 0

:FAIL
ECHO sign-files: signing failed; the working files are in !WORK!
EXIT /B 1
