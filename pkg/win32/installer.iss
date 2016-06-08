#define MyAppName "pgAdmin 4"
#define MyAppVersion "v1"
#define MyAppPublisher "The pgAdmin Development Team"
#define MyAppURL "www.pgadmin.org"
#define MyAppExeName "pgAdmin4.exe"
#define MyAppID "C14F64E7-DCB9-4DE1-8560-16F08FCFF64E"
#define MyAppFullVersion "1.0"
#define MyAppArchitecturesMode ""
#define MyAppVCDist "vcredist_x86.exe"
[Setup]
AppId={#MyAppName}{#MyAppVersion}
AppName={#MyAppName}
AppVersion={#MyAppFullVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}
DefaultDirName={pf}\{#MyAppName}\{#MyAppVersion}
DefaultGroupName={#MyAppName}
DisableWelcomePage=no
DisableProgramGroupPage=yes
LicenseFile=Resources\license.rtf
OutputBaseFilename=setup
SetupIconFile=Resources\pgAdmin4.ico
Compression=lzma
SolidCompression=yes
PrivilegesRequired=admin
ChangesEnvironment=yes
;UninstallFilesDir={app}\{#MyAppVersion}
ArchitecturesInstallIn64BitMode={#MyAppArchitecturesMode}

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Icons]
Name: {group}\{#MyAppName} {#MyAppVersion}; Filename: {app}\runtime\{#MyAppExeName}; IconFilename: {app}\pgAdmin4.ico; WorkingDir: {app}\runtime;

[Files]
Source: "..\..\win-build\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs;

[Run]
Filename: "{app}\installer\{#MyAppVCDist}"; StatusMsg: "VC runtime redistributable package"; Parameters: "/passive /verysilent /norestart"; Check: InstallVC;
Filename: "{app}\runtime\{#MyAppExeName}"; Description: "{cm:LaunchProgram,{#StringChange(MyAppName, '&', '&&')}}"; Flags: runascurrentuser nowait postinstall skipifsilent

[CustomMessages]
english.NewerVersionExists=A newer version of {#MyAppName}

[Registry]
Root: HKLM; Subkey: "Software\{#MyAppName}\{#MyAppVersion}"; Flags: uninsdeletekeyifempty
Root: HKLM; Subkey: "Software\{#MyAppName}\{#MyAppVersion}"; Flags: uninsdeletekey
Root: HKLM; Subkey: "Software\{#MyAppName}\{#MyAppVersion}"; ValueType: string; ValueName: "InstallPath"; ValueData: "{app}"
Root: HKLM; Subkey: "Software\{#MyAppName}\{#MyAppVersion}"; ValueType: string; ValueName: "Version"; ValueData: "{#MyAppFullVersion}"

[Code]
procedure CurStepChanged(CurStep: TSetupStep);
var
 value : string;
 begin
   if CurStep = ssInstall then begin
     value := ExpandConstant('{app}') + '\venv\Lib\site-packages' + ';' +
     ExpandConstant('{app}') + '\venv\Lib' + ';' +
     ExpandConstant('{app}') + '\venv\Lib\lib-tk' + ';' +
     ExpandConstant('{app}') + '\venv\DLLs';
     RegWriteStringValue(HKEY_CURRENT_USER,'Software\pgAdmin Development Team\pgAdmin 4', 'PythonPath', value);
 end;
end;

// find current version before installation
function InitializeSetup: Boolean;
var
  Version: String;
begin
  if RegValueExists(HKEY_LOCAL_MACHINE,'Software\{#MyAppName}\{#MyAppVersion}', 'Version') then
    begin
      RegQueryStringValue(HKEY_LOCAL_MACHINE,'Software\{#MyAppName}\{#MyAppVersion}', 'Version', Version);
      if Version > '{#MyAppFullVersion}' then
        begin
          MsgBox(ExpandConstant('{cm:NewerVersionExists}' + '(v' + Version + ') is already installed' ), mbInformation, MB_OK);
          Result := False;
        end
      else
        begin
          Result := True;
        end
    end
  else
    begin
      Result := True;
    end
end;

function InstallVC: Boolean;
begin
  Result := True;
end;

// End of program
