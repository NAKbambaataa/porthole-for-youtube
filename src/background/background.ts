// Clicking the toolbar icon opens the settings page. Nothing else happens in the background.
chrome.action.onClicked.addListener(() => {
  void chrome.runtime.openOptionsPage();
});
