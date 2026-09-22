; certum-pin-handler.ahk
;
; Answers the PIN prompt that the Certum cryptographic card raises the first
; time signtool touches the card's private key, so that a signed build can run
; without somebody sitting at the signing host's keyboard. See SIGNING.md for
; how that host is set up, and why the runner has to be in an interactive
; session for any of this to work at all.
;
; Compile it with Ahk2Exe, or run it with AutoHotkey v2 directly, and start it
; at login in the same session as the Actions runner.
;
;
; SECURITY
;
; This script types a PIN, and it reads that PIN from a file, so the file is
; the secret and its location and permissions are the whole of the protection
; around it. Keep it out of the repository and out of any backup that leaves
; the machine, and let only the build user read it:
;
;     icacls "%LOCALAPPDATA%\pgAdmin\certum-pin.txt" /inheritance:r ^
;         /grant:r "%USERNAME%:R" /grant:r "SYSTEM:F" /grant:r "Administrators:F"
;
; Two things follow from typing a secret into whatever holds the keyboard
; focus. The first is that the PIN is only ever sent once WinActive has
; confirmed that the card's own dialog is the active window, because a blind
; send would put the PIN into whatever happened to be in front, which on a
; build machine is quite likely to be a console whose output is uploaded as a
; log. The second is that nothing here writes the PIN to the log file; the log
; records what the script did, and never what it typed.
;
; A PIN that is wrong will be retyped at every prompt, and enough wrong
; attempts will block the card, which is a trip to the safe and a conversation
; with Certum rather than an afternoon's inconvenience. After changing the PIN,
; check the log for a prompt that did not close.

#Requires AutoHotkey v2.0
#SingleInstance Force

Persistent

; The proCertum software is localised, and the host runs it in Polish, so the
; dialog is titled "Logowanie do profilu zwyklego" ("log in to the common
; profile"), with a Polish barred l in the last word, rather than anything in
; English. Only the leading, unaccented part of that is matched, with
; SetTitleMatchMode 2 for a substring match: it survives the wording after it
; changing between proCertum releases or profiles, and it keeps this file to
; plain ASCII, so that no editor or AutoHotkey version can quietly mangle an
; accented character and leave behind a title that never matches. If the
; display language is ever changed, this is the line to change with it.
SetTitleMatchMode 2
DetectHiddenWindows false

PIN_DIALOG := "Logowanie do profilu"

PIN_DIR := EnvGet("LOCALAPPDATA")
if (PIN_DIR = "")
    PIN_DIR := A_AppData
PIN_DIR := PIN_DIR "\pgAdmin"

; The path is overridable so that the script can be exercised against a dummy
; dialog without the real PIN being anywhere on the machine.
PIN_FILE := EnvGet("PGADMIN_CERTUM_PIN_FILE")
if (PIN_FILE = "")
    PIN_FILE := PIN_DIR "\certum-pin.txt"

LOG_FILE := PIN_DIR "\certum-pin-handler.log"

CARD_PIN := ""

; Nothing this script does may put a dialog on the screen. An unattended
; machine has nobody to dismiss one, so AutoHotkey's default error dialog
; turns a momentary fault into a build that waits for a human who is not
; coming, which is exactly how a build was lost. Returning 1 suppresses the
; dialog and ends the offending thread, and because the work happens on a
; timer, the next tick starts a fresh one and the script carries on.
OnError SwallowError

PrepareLog()
CARD_PIN := ReadPin()

Log("Started. Watching for a window whose title contains '" PIN_DIALOG "'.")
Log("Reading the PIN from " PIN_FILE)

SetTimer AnswerPinDialog, 500


; Answer the dialog if it is on screen, and return quietly if it is not. This
; runs every half second for as long as the machine is up, so every way out of
; it is a return rather than an exit, and a prompt that cannot be answered now
; is simply one that will be tried again in half a second.
AnswerPinDialog() {
    global CARD_PIN, PIN_DIALOG

    try {
        hwnd := WinExist(PIN_DIALOG)
        if (!hwnd)
            return

        ; Hold on to the handle rather than the title. The window is addressed
        ; by identity from here on, so neither a title that changes underneath
        ; us nor a second window matching the same substring can send the PIN
        ; somewhere it was not meant to go.
        target := "ahk_id " hwnd

        ; The original of this script did a WinWait followed by a single
        ; WinActivate, and when that activate lost the race and threw "Target
        ; window not found" it was the end of the matter. Retry instead, for a
        ; couple of seconds, because activation fails transiently for all sorts
        ; of reasons, including the foreground lock timeout and the dialog
        ; still painting itself.
        activated := false
        loop 20 {
            if (!WinExist(target)) {
                Log("The dialog closed before it could be answered.")
                return
            }

            if (WinActive(target)) {
                activated := true
                break
            }

            try {
                WinActivate(target)
            } catch as e {
                ; Transient, and the loop is the retry.
            }

            Sleep 100
        }

        if (!activated) {
            Log("Could not bring the dialog to the foreground; retrying.")
            return
        }

        ; SendText rather than Send, because Send would read {, +, ^, ! and #
        ; in the PIN as key names and modifiers, and type something else.
        SendText(CARD_PIN)
        Sleep 100
        Send("{Enter}")

        if (WinWaitClose(target, , 10)) {
            Log("Answered the PIN prompt.")
            return
        }

        ; Still up, so either the PIN was refused or proCertum wants something
        ; else. Back off rather than hammering it, because a PIN retyped often
        ; enough is how a card gets blocked.
        Log("The prompt was still open ten seconds after being answered. "
          . "Check the PIN file: repeated wrong attempts will block the card.")
        Sleep 30000
    } catch as e {
        Log("Unexpected error whilst answering the prompt: " Describe(e))
    }
}


; Read the PIN, and stop if it is not there. A missing PIN file means a machine
; that was never finished being set up, and carrying on regardless would only
; move the failure into the middle of somebody's release.
ReadPin() {
    global PIN_FILE

    pin := ""

    try {
        pin := Trim(FileRead(PIN_FILE, "UTF-8"), " `t`r`n")
    } catch as e {
        Stop("Could not read the PIN file " PIN_FILE ": " Describe(e) ". "
           . "Create it, containing the card's PIN on a single line, and "
           . "restart this script. See pkg/win32/SIGNING.md.")
    }

    if (pin = "")
        Stop("The PIN file " PIN_FILE " is empty. It should hold the card's "
           . "PIN on a single line. See pkg/win32/SIGNING.md.")

    return pin
}


; Say what is wrong and go, without putting anything on screen that waits. A
; tray tip is not modal and expires by itself, so it can carry the message to
; anyone who happens to be looking at the console without ever becoming the
; thing a build is blocked on, and the log carries it to everyone else.
Stop(message) {
    Log("FATAL: " message)

    try {
        TrayTip(message, "pgAdmin Certum PIN handler")
    } catch as e {
        ; Better to exit quietly than to fail whilst reporting a failure.
    }

    Sleep 5000
    ExitApp 1
}


Log(message) {
    global LOG_FILE

    try {
        FileAppend(FormatTime(A_Now, "yyyy-MM-dd HH:mm:ss") "  " message "`n",
                   LOG_FILE, "UTF-8")
    } catch as e {
        ; A machine with a full or read-only disk has worse problems than an
        ; unwritten log line, and there is nowhere else to report this to.
    }
}


; Make sure there is somewhere to log to, and keep the log from growing without
; limit on a host that stays up for months at a time.
PrepareLog() {
    global LOG_FILE

    try {
        SplitPath(LOG_FILE, , &dir)
        DirCreate(dir)
    } catch as e {
        ; If the directory cannot be created, Log will fail quietly too.
    }

    try {
        if (FileGetSize(LOG_FILE) > 1048576)
            FileMove(LOG_FILE, LOG_FILE ".old", true)
    } catch as e {
        ; No log yet, which is the usual case on a fresh machine.
    }
}


Describe(e) {
    try {
        return Type(e) ": " e.Message
    } catch as inner {
        return "unrecognised error"
    }
}


SwallowError(thrown, mode) {
    Log("Unhandled error (" mode "): " Describe(thrown))
    return 1
}
