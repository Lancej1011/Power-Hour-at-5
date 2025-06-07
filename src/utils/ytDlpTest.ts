// Test utility for yt-dlp integration
export const testYtDlpIntegration = async () => {
  console.log('🧪 Testing yt-dlp integration...');
  
  try {
    // Check if Electron API is available
    if (!window.electronAPI) {
      console.error('❌ Electron API not available');
      return false;
    }
    
    // Test availability check
    console.log('🔧 Checking yt-dlp availability...');
    const availability = await window.electronAPI.ytDlpCheckAvailability();
    console.log('📊 Availability result:', availability);
    
    if (!availability.available) {
      console.error('❌ yt-dlp not available');
      return false;
    }
    
    // Test search functionality
    console.log('🔍 Testing search functionality...');
    const searchResult = await window.electronAPI.ytDlpSearch('test', 3);
    console.log('📊 Search result:', searchResult);
    
    if (!searchResult.success) {
      console.error('❌ Search failed:', searchResult.error);
      return false;
    }
    
    console.log('✅ yt-dlp integration test passed!');
    return true;
    
  } catch (error) {
    console.error('❌ yt-dlp integration test failed:', error);
    return false;
  }
};

// Make it available globally for testing
(window as any).testYtDlpIntegration = testYtDlpIntegration;
