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

!ifndef OUTFILE
  !define OUTFILE "..\release\Sidelight-${APPVERSION}-win-x64-setup.exe"
!endif

; Installer + uninstaller icon: the same .ico the host exe embeds (host\build.ps1 /win32icon).
; Paths resolve from this script's directory, like "..\packaging\sidelight.ico" below.
!define MUI_ICON "..\packaging\sidelight.ico"
!define MUI_UNICON "..\packaging\sidelight.ico"
Icon "..\packaging\sidelight.ico"

Name "${APPNAME}"
OutFile "${OUTFILE}"
InstallDir "$LOCALAPPDATA\Programs\Sidelight"
InstallDirRegKey HKCU "Software\Sidelight" "InstallDir"
RequestExecutionLevel user
SetCompressor /SOLID lzma
SetCompressorDictSize 32
ShowInstDetails show
ShowUninstDetails show

VIProductVersion "${APPVERSION}.0"
VIAddVersionKey /LANG=2052 "ProductName" "Sidelight"
VIAddVersionKey /LANG=2052 "ProductVersion" "${APPVERSION}"
VIAddVersionKey /LANG=2052 "FileVersion" "${APPVERSION}.0"
VIAddVersionKey /LANG=2052 "CompanyName" "${PUBLISHER}"
VIAddVersionKey /LANG=2052 "FileDescription" "Sidelight 安装器"
VIAddVersionKey /LANG=2052 "LegalCopyright" "Sidelight contributors"

!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_COMPONENTS
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

; Refuse to overwrite/remove while Sidelight.exe is running.
Function CheckRunning
  IfFileExists "$INSTDIR\Sidelight.exe" 0 done
  ClearErrors
  FileOpen $9 "$INSTDIR\Sidelight.exe" a
  IfErrors running
  FileClose $9
  Goto done
running:
  MessageBox MB_ICONSTOP|MB_OK "请先退出 Sidelight，再运行安装或卸载。" /SD IDOK
  SetErrorLevel 1
  Abort
done:
FunctionEnd

Function un.CheckRunning
  IfFileExists "$INSTDIR\Sidelight.exe" 0 done
  ClearErrors
  FileOpen $9 "$INSTDIR\Sidelight.exe" a
  IfErrors running
  FileClose $9
  Goto done
running:
  MessageBox MB_ICONSTOP|MB_OK "请先退出 Sidelight，再运行安装或卸载。" /SD IDOK
  SetErrorLevel 1
  Abort
done:
FunctionEnd

Section "Sidelight" SEC_MAIN
  SectionIn RO
  Call CheckRunning
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
  File "..\LICENSE"
  ; Upgrades: drop the previous web bundle first, or old hashed chunks pile up (+3.85 MB/upgrade).
  RMDir /r "$INSTDIR\www"
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

; Optional .md association: the section is unselected by default, so a silent install never writes it.
; Only HKCU Software\Classes: no machine-wide writes, no per-user association lists, no default handler.
Section /o "在「打开方式」中加入 Sidelight" SEC_ASSOC
!ifdef ASSOC_DRYRUN
  ; Test build: replace the 10 registry writes with a plan file, never touch the registry.
  FileOpen $9 "$INSTDIR\assoc-plan.txt" w
  FileWrite $9 "Software\Classes\Sidelight.md|Sidelight Markdown 文档$\r$\n"
  FileWrite $9 "Software\Classes\Sidelight.md\FriendlyTypeName|Sidelight Markdown 文档$\r$\n"
  FileWrite $9 "Software\Classes\Sidelight.md\DefaultIcon|$INSTDIR\Sidelight.exe,0$\r$\n"
  FileWrite $9 'Software\Classes\Sidelight.md\shell\open\command|"$INSTDIR\Sidelight.exe" "%1"$\r$\n'
  FileWrite $9 "Software\Classes\.md\OpenWithProgids|Sidelight.md$\r$\n"
  FileWrite $9 "Software\Classes\Applications\Sidelight.exe\ApplicationName|${APPNAME}$\r$\n"
  FileWrite $9 "Software\Classes\Applications\Sidelight.exe\ApplicationCompany|${PUBLISHER}$\r$\n"
  FileWrite $9 "Software\Classes\Applications\Sidelight.exe\ApplicationIcon|$INSTDIR\Sidelight.exe,0$\r$\n"
  FileWrite $9 'Software\Classes\Applications\Sidelight.exe\shell\open\command|"$INSTDIR\Sidelight.exe" "%1"$\r$\n'
  FileWrite $9 "Software\Classes\Applications\Sidelight.exe\SupportedTypes|.md$\r$\n"
  FileClose $9
!else
  WriteRegStr HKCU "Software\Classes\Sidelight.md" "" "Sidelight Markdown 文档"
  WriteRegStr HKCU "Software\Classes\Sidelight.md" "FriendlyTypeName" "Sidelight Markdown 文档"
  WriteRegStr HKCU "Software\Classes\Sidelight.md\DefaultIcon" "" "$INSTDIR\Sidelight.exe,0"
  WriteRegStr HKCU "Software\Classes\Sidelight.md\shell\open\command" "" '"$INSTDIR\Sidelight.exe" "%1"'
  WriteRegStr HKCU "Software\Classes\.md\OpenWithProgids" "Sidelight.md" ""
  WriteRegStr HKCU "Software\Classes\Applications\Sidelight.exe" "ApplicationName" "${APPNAME}"
  WriteRegStr HKCU "Software\Classes\Applications\Sidelight.exe" "ApplicationCompany" "${PUBLISHER}"
  WriteRegStr HKCU "Software\Classes\Applications\Sidelight.exe" "ApplicationIcon" "$INSTDIR\Sidelight.exe,0"
  WriteRegStr HKCU "Software\Classes\Applications\Sidelight.exe\shell\open\command" "" '"$INSTDIR\Sidelight.exe" "%1"'
  WriteRegStr HKCU "Software\Classes\Applications\Sidelight.exe\SupportedTypes" ".md" ""
!endif
SectionEnd

!insertmacro MUI_FUNCTION_DESCRIPTION_BEGIN
  !insertmacro MUI_DESCRIPTION_TEXT ${SEC_ASSOC} "在资源管理器的「打开方式」列表中加入 Sidelight。不改变 .md 的默认程序。"
!insertmacro MUI_FUNCTION_DESCRIPTION_END

Section "Uninstall"
  Call un.CheckRunning
  Delete "$SMPROGRAMS\Sidelight.lnk"
  ; Uninstall removes only the files this installer wrote. A recursive RMDir here
  ; wiped the whole install directory, including unrelated files when the user
  ; pointed the directory page at an existing folder.
  Delete "$INSTDIR\Sidelight.exe"
  Delete "$INSTDIR\Microsoft.Web.WebView2.Core.dll"
  Delete "$INSTDIR\Microsoft.Web.WebView2.WinForms.dll"
  Delete "$INSTDIR\WebView2Loader.dll"
  Delete "$INSTDIR\Sidelight.exe.config"
  Delete "$INSTDIR\sidelight.ico"
  Delete "$INSTDIR\README.txt"
  Delete "$INSTDIR\LICENSE"
  Delete "$INSTDIR\assoc-plan.txt"
  Delete "$INSTDIR\host.log*"
  ; www and webview2-data are entirely ours: www is rewritten on every install,
  ; webview2-data is the WebView2 profile the host creates (host/Program.cs).
  RMDir /r "$INSTDIR\www"
  RMDir /r "$INSTDIR\webview2-data"
  ; Host state dir: %LOCALAPPDATA% -> baseDir\state -> %TEMP% (host/Program.cs).
  ; Only recent.json* is ours. Never recurse here: the directory page can point
  ; at an existing folder that has its own state\ with the user's files.
  Delete "$INSTDIR\state\recent.json*"
  RMDir "$INSTDIR\state"
  Delete "$INSTDIR\uninstall.exe"
  RMDir "$INSTDIR"
  DeleteRegKey HKCU "${UNINST_KEY}"
  ; Association cleanup: only our value/progid; /ifempty keeps other apps' candidates (e.g. VSCode.md).
  DeleteRegValue HKCU "Software\Classes\.md\OpenWithProgids" "Sidelight.md"
  DeleteRegKey /ifempty HKCU "Software\Classes\.md\OpenWithProgids"
  DeleteRegKey HKCU "Software\Classes\Sidelight.md"
  DeleteRegKey HKCU "Software\Classes\Applications\Sidelight.exe"
  DeleteRegKey HKCU "Software\Sidelight"
  ; User data under %LOCALAPPDATA%\Sidelight (WebView2 profile) is intentionally kept.
SectionEnd
