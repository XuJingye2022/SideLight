; Sidelight per-user NSIS installer.
; Comments are ASCII only: makensis refuses non-ASCII comments without a BOM.
; Build with packaging\installer.ps1 (it passes APPVERSION / ESTSIZE).
Unicode true

!include "MUI2.nsh"

!ifndef APPVERSION
  !define APPVERSION "0.0.0"
!endif
!ifndef ESTSIZE
  !define ESTSIZE "2400"
!endif

!define APPNAME "Sidelight"
!define PUBLISHER "Sidelight contributors"
!define UNINST_KEY "Software\Microsoft\Windows\CurrentVersion\Uninstall\Sidelight"
!define WEBVIEW2_CLIENT "{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}"

Name "${APPNAME}"
OutFile "..\release\Sidelight-${APPVERSION}-win-x64-setup.exe"
InstallDir "$LOCALAPPDATA\Programs\Sidelight"
InstallDirRegKey HKCU "Software\Sidelight" "InstallDir"
RequestExecutionLevel user
SetCompressor /SOLID lzma
SetCompressorDictSize 32
ShowInstDetails show
ShowUninstDetails show

!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_LANGUAGE "SimpChinese"

; Look for msedgewebview2.exe under $3 (one runtime version dir). Sets $0=found if present.
; FindFirst cannot wildcard a middle directory, so enumerate version dirs one level.
Function CheckRuntimeDir
  StrCpy $0 ""
  FindFirst $1 $2 "$3\*"
  loop:
    StrCmp $2 "" done
    IfFileExists "$3\$2\msedgewebview2.exe" found
    FindNext $1 $2
    Goto loop
  found:
    StrCpy $0 "found"
  done:
  FindClose $1
FunctionEnd

Section "Sidelight" SEC_MAIN
  ; WebView2 runtime check: EdgeUpdate pv (32-bit view, then 64-bit, then HKCU), or the loader exe.
  SetRegView 32
  ReadRegStr $0 HKLM "SOFTWARE\Microsoft\EdgeUpdate\Clients\${WEBVIEW2_CLIENT}" "pv"
  StrCmp $0 "" 0 do_copy
  SetRegView 64
  ReadRegStr $0 HKLM "SOFTWARE\Microsoft\EdgeUpdate\Clients\${WEBVIEW2_CLIENT}" "pv"
  StrCmp $0 "" 0 do_copy
  ReadRegStr $0 HKCU "Software\Microsoft\EdgeUpdate\Clients\${WEBVIEW2_CLIENT}" "pv"
  StrCmp $0 "" 0 do_copy

  StrCpy $3 "$PROGRAMFILES\Microsoft\EdgeWebView\Application"
  Call CheckRuntimeDir
  StrCmp $0 "found" 0 check64
  Goto do_copy
check64:
  StrCpy $3 "$PROGRAMFILES64\Microsoft\EdgeWebView\Application"
  Call CheckRuntimeDir
  StrCmp $0 "found" 0 runtime_missing
  Goto do_copy

runtime_missing:
  MessageBox MB_ICONSTOP|MB_OK "需要 Microsoft WebView2 运行时。下载：https://go.microsoft.com/fwlink/p/?LinkId=2124703 装完再运行本安装器。" /SD IDOK
  Abort

do_copy:
  SetOutPath "$INSTDIR"
  File "..\host\bin\Sidelight.exe"
  File "..\host\bin\Microsoft.Web.WebView2.Core.dll"
  File "..\host\bin\Microsoft.Web.WebView2.WinForms.dll"
  File "..\host\bin\WebView2Loader.dll"
  File "..\host\bin\Sidelight.exe.config"
  File "..\packaging\sidelight.ico"
  File "..\packaging\README.txt"
  File "..\LICENSE"
  SetOutPath "$INSTDIR\www"
  File /r "..\dist\*"
  SetOutPath "$INSTDIR"
  WriteUninstaller "$INSTDIR\uninstall.exe"

  CreateShortcut "$SMPROGRAMS\Sidelight.lnk" "$INSTDIR\Sidelight.exe"

  WriteRegStr HKCU "Software\Sidelight" "InstallDir" "$INSTDIR"
  WriteRegStr HKCU "${UNINST_KEY}" "DisplayName" "${APPNAME}"
  WriteRegStr HKCU "${UNINST_KEY}" "DisplayVersion" "${APPVERSION}"
  WriteRegStr HKCU "${UNINST_KEY}" "Publisher" "${PUBLISHER}"
  WriteRegStr HKCU "${UNINST_KEY}" "DisplayIcon" "$INSTDIR\Sidelight.exe"
  WriteRegStr HKCU "${UNINST_KEY}" "InstallLocation" "$INSTDIR"
  WriteRegStr HKCU "${UNINST_KEY}" "UninstallString" '"$INSTDIR\uninstall.exe"'
  WriteRegDWORD HKCU "${UNINST_KEY}" "EstimatedSize" ${ESTSIZE}
  WriteRegDWORD HKCU "${UNINST_KEY}" "NoModify" 1
  WriteRegDWORD HKCU "${UNINST_KEY}" "NoRepair" 1
SectionEnd

Section "Uninstall"
  Delete "$SMPROGRAMS\Sidelight.lnk"
  RMDir /r "$INSTDIR"
  DeleteRegKey HKCU "${UNINST_KEY}"
  DeleteRegKey HKCU "Software\Sidelight"
  ; User data under %LOCALAPPDATA%\Sidelight (WebView2 profile) is intentionally kept.
SectionEnd
