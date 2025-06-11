# PHat5 NSIS Installer Script
# Custom installer configuration for enhanced functionality

!include "MUI2.nsh"
!include "FileFunc.nsh"

# Installer attributes
Name "PHat5"
OutFile "PHat5-Setup.exe"
InstallDir "$PROGRAMFILES64\PHat5"
InstallDirRegKey HKLM "Software\PHat5" "InstallPath"
RequestExecutionLevel admin

# Version information
VIProductVersion "1.0.0.0"
VIAddVersionKey "ProductName" "PHat5"
VIAddVersionKey "CompanyName" "PHat5 Development Team"
VIAddVersionKey "FileDescription" "PHat5 Installer"
VIAddVersionKey "FileVersion" "1.0.0.0"
VIAddVersionKey "ProductVersion" "1.0.0.0"
VIAddVersionKey "LegalCopyright" "© 2024 PHat5 Development Team"

# Modern UI configuration
!define MUI_ABORTWARNING
!define MUI_ICON "public\icon.ico"
!define MUI_UNICON "public\icon.ico"
!define MUI_HEADERIMAGE
!define MUI_HEADERIMAGE_BITMAP "public\logo512.png"
!define MUI_WELCOMEFINISHPAGE_BITMAP "public\logo512.png"

# Pages
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_LICENSE "LICENSE"
!insertmacro MUI_PAGE_COMPONENTS
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_UNPAGE_WELCOME
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_UNPAGE_FINISH

# Languages
!insertmacro MUI_LANGUAGE "English"

# Sections
Section "PHat5 Application" SecMain
    SectionIn RO
    
    # Set output path
    SetOutPath "$INSTDIR"
    
    # Install main application files
    File /r "dist-electron\win-unpacked\*.*"
    
    # Create shortcuts
    CreateDirectory "$SMPROGRAMS\PHat5"
    CreateShortCut "$SMPROGRAMS\PHat5\PHat5.lnk" "$INSTDIR\PHat5.exe"
    CreateShortCut "$SMPROGRAMS\PHat5\Uninstall PHat5.lnk" "$INSTDIR\Uninstall.exe"
    CreateShortCut "$DESKTOP\PHat5.lnk" "$INSTDIR\PHat5.exe"
    
    # Register uninstaller
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\PHat5" "DisplayName" "PHat5"
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\PHat5" "UninstallString" "$INSTDIR\Uninstall.exe"
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\PHat5" "InstallLocation" "$INSTDIR"
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\PHat5" "DisplayIcon" "$INSTDIR\PHat5.exe"
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\PHat5" "Publisher" "PHat5 Development Team"
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\PHat5" "DisplayVersion" "1.0.0"
    WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\PHat5" "NoModify" 1
    WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\PHat5" "NoRepair" 1
    
    # Store installation path
    WriteRegStr HKLM "Software\PHat5" "InstallPath" "$INSTDIR"
    
    # Create uninstaller
    WriteUninstaller "$INSTDIR\Uninstall.exe"
SectionEnd

Section "File Associations" SecFileAssoc
    # Register .phat5 file extension
    WriteRegStr HKCR ".phat5" "" "PHat5.Playlist"
    WriteRegStr HKCR "PHat5.Playlist" "" "PHat5 Playlist"
    WriteRegStr HKCR "PHat5.Playlist\DefaultIcon" "" "$INSTDIR\PHat5.exe,0"
    WriteRegStr HKCR "PHat5.Playlist\shell\open\command" "" '"$INSTDIR\PHat5.exe" "%1"'
    
    # Register .ph5mix file extension
    WriteRegStr HKCR ".ph5mix" "" "PHat5.Mix"
    WriteRegStr HKCR "PHat5.Mix" "" "PHat5 Mix"
    WriteRegStr HKCR "PHat5.Mix\DefaultIcon" "" "$INSTDIR\PHat5.exe,0"
    WriteRegStr HKCR "PHat5.Mix\shell\open\command" "" '"$INSTDIR\PHat5.exe" "%1"'
    
    # Refresh shell
    System::Call 'shell32.dll::SHChangeNotify(i, i, i, i) v (0x08000000, 0, 0, 0)'
SectionEnd

Section "Desktop Integration" SecDesktop
    # Add to Windows Start Menu search
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\App Paths\PHat5.exe" "" "$INSTDIR\PHat5.exe"
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\App Paths\PHat5.exe" "Path" "$INSTDIR"
SectionEnd

Section "Auto-Updater" SecUpdater
    # Create auto-updater configuration
    WriteRegStr HKLM "Software\PHat5\Updater" "Enabled" "1"
    WriteRegStr HKLM "Software\PHat5\Updater" "CheckInterval" "24"
    WriteRegStr HKLM "Software\PHat5\Updater" "UpdateURL" "https://api.github.com/repos/Lancej1011/Power-Hour-at-5/releases"
SectionEnd

# Section descriptions
!insertmacro MUI_FUNCTION_DESCRIPTION_BEGIN
    !insertmacro MUI_DESCRIPTION_TEXT ${SecMain} "Core PHat5 application files (required)"
    !insertmacro MUI_DESCRIPTION_TEXT ${SecFileAssoc} "Associate .phat5 and .ph5mix files with PHat5"
    !insertmacro MUI_DESCRIPTION_TEXT ${SecDesktop} "Add PHat5 to Windows search and quick access"
    !insertmacro MUI_DESCRIPTION_TEXT ${SecUpdater} "Enable automatic update checking"
!insertmacro MUI_FUNCTION_DESCRIPTION_END

# Installer functions
Function .onInit
    # Check if already installed
    ReadRegStr $R0 HKLM "Software\PHat5" "InstallPath"
    StrCmp $R0 "" done
    
    MessageBox MB_OKCANCEL|MB_ICONEXCLAMATION \
        "PHat5 is already installed. $\n$\nClick OK to upgrade the existing installation or Cancel to exit." \
        IDOK done
    Abort
    
    done:
FunctionEnd

# Uninstaller section
Section "Uninstall"
    # Remove files
    RMDir /r "$INSTDIR"
    
    # Remove shortcuts
    Delete "$DESKTOP\PHat5.lnk"
    RMDir /r "$SMPROGRAMS\PHat5"
    
    # Remove registry entries
    DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\PHat5"
    DeleteRegKey HKLM "Software\PHat5"
    DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\App Paths\PHat5.exe"
    
    # Remove file associations
    DeleteRegKey HKCR ".phat5"
    DeleteRegKey HKCR "PHat5.Playlist"
    DeleteRegKey HKCR ".ph5mix"
    DeleteRegKey HKCR "PHat5.Mix"
    
    # Refresh shell
    System::Call 'shell32.dll::SHChangeNotify(i, i, i, i) v (0x08000000, 0, 0, 0)'
    
    # Remove user data (optional)
    MessageBox MB_YESNO|MB_ICONQUESTION \
        "Do you want to remove all PHat5 user data including playlists, mixes, and settings? $\n$\nThis cannot be undone." \
        IDNO skip_userdata
    
    RMDir /r "$APPDATA\PHat5"
    RMDir /r "$LOCALAPPDATA\PHat5"
    
    skip_userdata:
SectionEnd

# Uninstaller functions
Function un.onInit
    MessageBox MB_OKCANCEL|MB_ICONEXCLAMATION \
        "This will completely remove PHat5 from your computer. $\n$\nClick OK to continue or Cancel to exit." \
        IDOK done
    Abort
    
    done:
FunctionEnd
