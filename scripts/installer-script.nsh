# PHat5 Advanced Installer Script
# Additional installer functionality and customizations

# Variables
Var StartMenuFolder
Var CreateDesktopShortcut
Var CreateQuickLaunchShortcut
Var InstallUpdater
Var PreviousVersion
Var PreviousInstallDir

# Custom functions for installer
Function .onInit
    # Check Windows version compatibility
    ${IfNot} ${AtLeastWin10}
        MessageBox MB_OK|MB_ICONSTOP "PHat5 requires Windows 10 or later. Installation cannot continue."
        Abort
    ${EndIf}
    
    # Check for existing installation
    ReadRegStr $PreviousInstallDir HKLM "Software\PHat5" "InstallPath"
    ReadRegStr $PreviousVersion HKLM "Software\PHat5" "Version"
    
    ${If} $PreviousInstallDir != ""
        ${If} $PreviousVersion != ""
            MessageBox MB_YESNO|MB_ICONQUESTION \
                "PHat5 version $PreviousVersion is already installed in:$\r$\n$PreviousInstallDir$\r$\n$\r$\nDo you want to upgrade the existing installation?" \
                IDYES upgrade IDNO fresh_install
            
            upgrade:
                StrCpy $INSTDIR $PreviousInstallDir
                Goto init_done
                
            fresh_install:
                # User chose not to upgrade, continue with fresh install
        ${Else}
            MessageBox MB_YESNO|MB_ICONQUESTION \
                "PHat5 appears to be already installed. Do you want to reinstall?" \
                IDYES init_done
            Abort
        ${EndIf}
    ${EndIf}
    
    init_done:
    
    # Initialize variables
    StrCpy $StartMenuFolder "PHat5"
    StrCpy $CreateDesktopShortcut "1"
    StrCpy $CreateQuickLaunchShortcut "0"
    StrCpy $InstallUpdater "1"
    
    # Check available disk space (require at least 500MB)
    ${GetRoot} "$INSTDIR" $R0
    ${DriveSpace} "$R0" "/D=F /S=M" $R1
    ${If} $R1 < 500
        MessageBox MB_OK|MB_ICONSTOP "Insufficient disk space. At least 500 MB of free space is required."
        Abort
    ${EndIf}
FunctionEnd

# Custom page for installation options
Function InstallOptionsPage
    !insertmacro MUI_HEADER_TEXT "Installation Options" "Choose additional installation options"
    
    nsDialogs::Create 1018
    Pop $0
    
    ${If} $0 == error
        Abort
    ${EndIf}
    
    # Desktop shortcut checkbox
    ${NSD_CreateCheckbox} 10 20 200 12 "Create desktop shortcut"
    Pop $1
    ${If} $CreateDesktopShortcut == "1"
        ${NSD_Check} $1
    ${EndIf}
    
    # Quick launch shortcut checkbox
    ${NSD_CreateCheckbox} 10 40 200 12 "Create quick launch shortcut"
    Pop $2
    ${If} $CreateQuickLaunchShortcut == "1"
        ${NSD_Check} $2
    ${EndIf}
    
    # Auto-updater checkbox
    ${NSD_CreateCheckbox} 10 60 200 12 "Enable automatic updates"
    Pop $3
    ${If} $InstallUpdater == "1"
        ${NSD_Check} $3
    ${EndIf}
    
    # Information text
    ${NSD_CreateLabel} 10 90 280 40 "PHat5 will be installed with the selected options. The auto-updater helps keep your application up-to-date with the latest features and security improvements."
    Pop $4
    
    nsDialogs::Show
FunctionEnd

Function InstallOptionsPageLeave
    # Get checkbox states
    ${NSD_GetState} $1 $CreateDesktopShortcut
    ${NSD_GetState} $2 $CreateQuickLaunchShortcut
    ${NSD_GetState} $3 $InstallUpdater
FunctionEnd

# Pre-installation cleanup
Function PreInstallCleanup
    # Stop PHat5 if running
    DetailPrint "Checking for running PHat5 processes..."
    
    retry_close:
    FindWindow $0 "" "PHat5"
    ${If} $0 != 0
        MessageBox MB_RETRYCANCEL|MB_ICONEXCLAMATION \
            "PHat5 is currently running. Please close it before continuing." \
            IDRETRY retry_close
        Abort
    ${EndIf}
    
    # Kill any remaining processes
    nsExec::ExecToLog 'taskkill /F /IM "PHat5.exe" /T'
    Sleep 1000
    
    # Backup user data if upgrading
    ${If} $PreviousVersion != ""
        DetailPrint "Backing up user data..."
        CreateDirectory "$TEMP\PHat5-Backup"
        
        # Backup user data directory
        ${If} ${FileExists} "$APPDATA\PHat5\*.*"
            CopyFiles /SILENT "$APPDATA\PHat5\*.*" "$TEMP\PHat5-Backup\"
        ${EndIf}
    ${EndIf}
FunctionEnd

# Post-installation setup
Function PostInstallSetup
    DetailPrint "Configuring PHat5..."
    
    # Restore user data if upgrading
    ${If} $PreviousVersion != ""
        ${If} ${FileExists} "$TEMP\PHat5-Backup\*.*"
            DetailPrint "Restoring user data..."
            CreateDirectory "$APPDATA\PHat5"
            CopyFiles /SILENT "$TEMP\PHat5-Backup\*.*" "$APPDATA\PHat5\"
            RMDir /r "$TEMP\PHat5-Backup"
        ${EndIf}
    ${EndIf}
    
    # Set up file associations
    DetailPrint "Setting up file associations..."
    
    # Register application
    WriteRegStr HKLM "Software\Classes\Applications\PHat5.exe\FriendlyAppName" "" "PHat5"
    WriteRegStr HKLM "Software\Classes\Applications\PHat5.exe\shell\open\command" "" '"$INSTDIR\PHat5.exe" "%1"'
    
    # Create application capabilities
    WriteRegStr HKLM "Software\PHat5\Capabilities" "ApplicationName" "PHat5"
    WriteRegStr HKLM "Software\PHat5\Capabilities" "ApplicationDescription" "The ultimate Power Hour music mixing application"
    
    # Register with Windows
    WriteRegStr HKLM "Software\RegisteredApplications" "PHat5" "Software\PHat5\Capabilities"
    
    # Update system
    System::Call 'shell32.dll::SHChangeNotify(i, i, i, i) v (0x08000000, 0, 0, 0)'
FunctionEnd

# Installation progress callback
Function InstallProgressCallback
    # This function can be used to show custom progress information
    # Currently just using default progress display
FunctionEnd

# Uninstaller initialization
Function un.onInit
    MessageBox MB_YESNO|MB_ICONQUESTION \
        "Are you sure you want to completely remove PHat5 and all of its components?" \
        IDYES uninit_done
    Abort
    
    uninit_done:
FunctionEnd

# Custom uninstall cleanup
Function un.CustomCleanup
    # Stop any running processes
    nsExec::ExecToLog 'taskkill /F /IM "PHat5.exe" /T'
    Sleep 1000
    
    # Remove application data (with user confirmation)
    MessageBox MB_YESNO|MB_ICONQUESTION \
        "Do you want to remove all PHat5 user data including playlists, mixes, and settings?$\r$\n$\r$\nThis action cannot be undone." \
        IDNO skip_userdata
    
    DetailPrint "Removing user data..."
    RMDir /r "$APPDATA\PHat5"
    RMDir /r "$LOCALAPPDATA\PHat5"
    
    skip_userdata:
    
    # Clean up registry
    DeleteRegKey HKLM "Software\Classes\Applications\PHat5.exe"
    DeleteRegKey HKLM "Software\PHat5\Capabilities"
    DeleteRegValue HKLM "Software\RegisteredApplications" "PHat5"
    
    # Refresh system
    System::Call 'shell32.dll::SHChangeNotify(i, i, i, i) v (0x08000000, 0, 0, 0)'
FunctionEnd
