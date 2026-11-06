function openNotebook() {
  return chrome.tabs.create({ url: chrome.runtime.getURL("review.html") });
}

chrome.action.onClicked.addListener(openNotebook);

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message !== "open-notebook") return;
  openNotebook().then(() => sendResponse(true), () => sendResponse(false));
  return true;
});
