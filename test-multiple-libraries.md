# Multiple Library Support Test Plan

## Overview
This document outlines the test plan for verifying that the Library Manager now supports multiple concurrent music library folders.

## Changes Made

### 1. LibraryContext.tsx
- **Modified `chooseLibraryFolder` function**: Now adds libraries instead of replacing them
- **Added `removeLibrary` function**: Allows removal of individual libraries with proper current library switching
- **Added `refreshLibrary` function**: Allows refreshing individual libraries without affecting others
- **Enhanced library existence checking**: Prevents duplicate libraries and switches to existing ones

### 2. LibraryManager.tsx
- **Added new props**: `onRemoveLibrary` and `onRefreshLibrary`
- **Updated handlers**: `handleDeleteLibrary` and `handleRefreshLibrary` now use context methods
- **Enhanced UI**: Proper library management with individual controls

### 3. SongUploader.tsx
- **Added new props**: Passes `library.removeLibrary` and `library.refreshLibrary` to LibraryManager

## Test Scenarios

### Test 1: Adding Multiple Libraries
1. Open the application
2. Click "My Library" button to open Library Manager
3. Click "Add Library" and select first music folder (e.g., "C:\Users\Joe\Music\Folder1")
4. Verify library is added and becomes current
5. Click "Add Library" again and select second music folder (e.g., "C:\Users\Joe\Music\Folder2")
6. Verify second library is added without removing the first
7. Check that both libraries appear in the list

**Expected Result**: Both libraries should be visible in the Library Manager, with the most recently added being the current/active library.

### Test 2: Switching Between Libraries
1. With multiple libraries added, click the "Select Library" button (music note icon) for a different library
2. Verify the library switches and the UI updates to show the new current library
3. Check that the song list updates to show songs from the selected library

**Expected Result**: Should be able to switch between libraries seamlessly, with the UI reflecting the current library.

### Test 3: Refreshing Individual Libraries
1. With multiple libraries added, click the "Refresh Library" button (refresh icon) for one library
2. Verify only that library is rescanned
3. Check that other libraries remain unchanged

**Expected Result**: Only the selected library should be refreshed, others should remain intact.

### Test 4: Removing Individual Libraries
1. With multiple libraries added, click the "Remove from Cache" button (delete icon) for one library
2. Confirm the removal in the dialog
3. Verify the library is removed from the list
4. If the removed library was current, verify the system switches to another available library

**Expected Result**: The selected library should be removed, and if it was current, the system should automatically switch to another library.

### Test 5: Duplicate Library Prevention
1. Add a library folder
2. Try to add the same folder again
3. Verify the system detects the duplicate and switches to the existing library instead of creating a duplicate

**Expected Result**: Should show a message indicating switching to existing library, no duplicate should be created.

## Key Behaviors to Verify

1. **Library Persistence**: Libraries should persist between application restarts
2. **Current Library Tracking**: The system should remember which library is currently active
3. **Independent Management**: Each library should maintain its own metadata and song collection
4. **Proper Cleanup**: Removing libraries should properly clean up references and switch current library if needed
5. **Error Handling**: Should handle cases where library folders are moved or deleted

## Success Criteria

- ✅ Multiple libraries can be added simultaneously
- ✅ Libraries can be switched between without losing data
- ✅ Individual libraries can be refreshed independently
- ✅ Individual libraries can be removed with proper cleanup
- ✅ Duplicate library detection works correctly
- ✅ Current library state is properly maintained
- ✅ UI correctly reflects the current library status
