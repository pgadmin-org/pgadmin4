# pgAdmin Windows Signing Host

The Windows installer is signed with a Certum Open Source code signing
certificate held on a hardware cryptographic card, which cannot be copied,
exported, or handed to a cloud runner. Everything else in the release pipeline
runs on ephemeral, disposable machines described entirely by the workflow files
in `.github/workflows/`; this one machine is configured by hand and holds
something irreplaceable, so this document is the record of how it is set up.

If that machine ever dies, this document is what stands between you and a very
bad week. Please keep it current.

## What the machine does

It runs a self-hosted GitHub Actions runner, which builds and signs the
snapshot and release installers (`.github/workflows/snapshot-windows.yml` and
its release equivalent). The unsigned QA build in `check-windows-build.yml`
deliberately does *not* run here: it uses a GitHub-hosted runner, because it
needs no certificate and there is no reason to put ordinary CI traffic on the
machine that holds the signing key.

## Hardware

A Certum cryptographic card in an ACS ACR40T reader, holding the code signing
certificate and its private key. The key never leaves the card; signing
operations happen on it.

## Why the runner must not be a Windows service

This is the single most important thing on this page, because the failure is
silent rather than loud.

Signing prompts for the card's PIN, and that prompt is a window on the
interactive desktop. An AutoHotkey helper answers it automatically. A Windows
service runs in session 0, which has no desktop, so the prompt appears
somewhere the helper cannot see it and the build hangs until its timeout rather
than failing with anything useful.

So the machine logs in automatically, and both the runner and the PIN helper
start in that session. When configuring the runner, answer **N** to
`config.cmd`'s "run as a service" question, and never pass `--runasservice`,
`--windowslogonaccount` or `--windowslogonpassword`.

The same applies to Task Scheduler, if you use it instead of the Startup
folder: choose "Run only when user is logged on". The adjacent option, "Run
whether user is logged on or not", is the service problem wearing a different
hat.

## Machine configuration

### Automatic login

```powershell
$regPath = "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon"
Set-ItemProperty -Path $regPath -Name "AutoAdminLogon"  -Value "1"
Set-ItemProperty -Path $regPath -Name "DefaultUserName" -Value "<build user>"
Set-ItemProperty -Path $regPath -Name "DefaultPassword" -Value "<password>"
```

### Never sleep

A sleeping machine is an offline runner, and a release that waits.

```powershell
powercfg -change -standby-timeout-ac 0
powercfg -change -monitor-timeout-ac 0
powercfg -change -hibernate-timeout-ac 0
```

### The Actions runner

Install under a short path, `C:\actions-runner`, to stay clear of Windows path
length limits. Register it against `pgadmin-org/pgadmin4`, answering **N** to
the service question, then start it from the logged-in session:

```powershell
$startup = [Environment]::GetFolderPath('Startup')
$s = (New-Object -ComObject WScript.Shell).CreateShortcut("$startup\actions-runner.lnk")
$s.TargetPath       = 'C:\actions-runner\run.cmd'
$s.WorkingDirectory = 'C:\actions-runner'
$s.Save()
```

Startup folder ordering is not guaranteed, so if you want to be certain the PIN
helper is up before any job can arrive, point the shortcut at a batch file that
sleeps briefly first.

### The PIN helper

An AutoHotkey executable that watches for the card's PIN dialog and answers it.
It must start in the same session, by the same mechanism, at login.

### Build prerequisites

The build needs Inno Setup, syft and wget beyond what Visual Studio and the
Windows SDK provide. The workflow checks for these and stops with the command
to install them rather than installing anything itself, on the grounds that a
CI job should not be modifying the one machine that cannot be rebuilt.

```
choco install innosetup syft wget -y
```

Visual Studio, the VC++ redistributable and `signtool.exe` are located by the
workflow at build time rather than configured here, so an SDK or Visual Studio
update does not require editing anything.

## Certificate setup

The card's "simple" registration through proCertum Card Manager does not
correctly link the certificate to its private key. Without the repair below,
signing either fails or silently degrades to SHA1.

**All of this needs local console access.** Smart card operations do not work
over Remote Desktop, and the usual symptom is `certutil -key` failing with
`NTE_KEYSET_NOT_DEF (0x80090019)`.

### 1. Put proCertum in CSP mode

Open proCertum Card Manager, go to Options, select **CSP driver** rather than
Minidriver, apply, and restart Windows.

### 2. Import the certificate to the machine store

In proCertum Card Manager: Read Card, then the Common Profile tab, select the
code signing certificate, Show certificate details, and install it into the
Windows **machine** store, under Personal. The machine store is why the build
signs with `/sm`.

### 3. Link the certificate to the key

`certutil -store My` will show the certificate with `No key provider
information`, which is expected at this point.

Find the key container:

```batch
certutil -key -csp "crypto3 CSP"
```

Create `keyprov.inf`, substituting the container ID. The trailing `&` on each
line is required INF syntax, not a typo:

```ini
[Properties]
2 = "{text}"
    _continue_ = "Container=<key container id>&"
    _continue_ = "Provider=crypto3 CSP&"
    _continue_ = "ProviderType=1&"
    _continue_ = "Flags=0&"
    _continue_ = "KeySpec=2"
```

Find the certificate's SHA1 thumbprint with `certutil -store My`, looking for
`Cert Hash(sha1)`, and repair the store as Administrator:

```batch
certutil -repairstore My "<thumbprint>" keyprov.inf
```

`certutil -store My` should now report `Provider = crypto3 CSP` and a
`Key Container`.

## How the build signs

`Make.bat` signs only when `PGADMIN_WINDOWS_CSC` is set, and selects the
certificate by subject name from the machine store. It is held as a repository
variable on `pgadmin-org/pgadmin4` rather than in this repository, so that a
certificate renewal is a settings change rather than a commit. The snapshot
workflow fails immediately if it is unset, rather than quietly producing an
unsigned installer that looks like a successful build.

The signing call it makes is equivalent to:

```batch
signtool sign /sm /n "<certificate subject>" /tr http://timestamp.digicert.com /td sha256 /fd sha256 /v <file>
```

| Parameter | Why |
|---|---|
| `/sm` | machine store, which is where the certificate was installed |
| `/n` | selects the certificate by subject name |
| `/fd sha256` | file digest algorithm |
| `/tr` | RFC 3161 timestamp server; prefer this over the legacy `/t` |
| `/td sha256` | timestamp digest algorithm |

Timestamping matters: without it, signatures stop validating when the
certificate expires. If DigiCert's server is unavailable,
`http://timestamp.sectigo.com` and `http://ts.ssl.com` are alternatives.
Certum's own, `http://time.certum.pl`, was unreliable during setup.

Verify with:

```batch
signtool verify /pa /v <file>
```

## Troubleshooting

**`certutil -key` fails with `NTE_KEYSET_NOT_DEF (0x80090019)`.** Almost always
Remote Desktop: smart card operations need a local console session. Otherwise
check proCertum is in CSP mode rather than Minidriver, that Windows was
restarted after changing it, and that the card is seated and readable.

**"No certificates were found that met all the given criteria".** Check `/sm`
is being passed, that `certutil -store My` shows the certificate, and that the
key provider link from step 3 exists.

**`SignerSign() failed`.** Check the card is inserted and readable, that the
PIN prompt has not appeared behind another window, and that the
certificate-to-key link is intact.

**The build hangs rather than failing.** The runner is almost certainly running
as a service, or as a scheduled task set to "run whether user is logged on or
not", so the PIN prompt is somewhere nothing can answer it. See above.

**The first signature after the card is inserted prompts for a PIN.** Expected.
Subsequent operations in the same session may be cached, depending on proCertum
settings.

## Fully unattended signing

There isn't a clean answer. PIN entry is the obstacle, and the arrangement here
works around it rather than solving it: the card is unlocked once per boot in
an interactive session and a helper answers the dialog. Options investigated
and rejected were PIN caching in proCertum alone, which does not survive a
reboot, and `CRYPTOAPI_PIN`-style environment variables, which the CSP ignored.

If this becomes painful enough to be worth removing, the way out is a cloud
signing service such as Azure Trusted Signing, SignPath, or Certum's own cloud
offering, all of which replace the token with an API credential and would let
this machine disappear along with the rest of the buildfarm.
