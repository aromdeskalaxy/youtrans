# YouTrans

[ภาษาไทย](README.th.md) · [MIT License](LICENSE)

<img src="icons/icon128.png" width="64" height="64" alt="YouTrans icon">

YouTrans is a Chrome extension for learning languages with YouTube. It keeps the video's primary captions visible and adds a second language. Hover over a word to see a matching translation, click to replay the passage, or save the word for later review.

## Install from GitHub

Requires desktop Chrome 138 or later and a YouTube video with captions.

1. On the repository page, choose **Code → Download ZIP** and extract the archive. You can also clone the repository.
2. Open `chrome://extensions` and turn on **Developer mode**.
3. Click **Load unpacked** and select the extracted folder containing `manifest.json`.
4. Open or refresh a YouTube watch page.

You can load the source directly. The project has no build step or package installation. To update, replace the files in the loaded folder, click **Reload** on the extension card, and refresh YouTube. Keep the extension installed to retain its saved data in that Chrome profile.

## Watch and review

| Action | Result |
| --- | --- |
| Click the language-pair button, initially **EN + ไทย** | Toggle dual captions for the current video. YouTrans remembers the setting for each video. New videos start with dual captions off. |
| Click **⚙** | Choose the primary and secondary languages. Use **บันทึกคลิปนี้** to save the pair for this video or **ใช้เป็นค่าเริ่มต้น** to set the default pair. A per-video pair takes precedence over the default. |
| Hover over a word in the primary captions | Highlight a matching word or phrase in the secondary caption when one is found. |
| Click a word | Seek back to when that word appeared in the captions and resume playback. |
| **Alt + click** or **Option + click** on Mac | Save the word, translation when available, example caption, and video timestamp. |
| Click the bookmark button in the player or the YouTrans toolbar icon | Open the notebook to search, remove words, or reopen a clip at its saved timestamp. |

### Caption and translation availability

The primary language comes from the video's YouTube caption tracks. If the preferred primary language is missing, YouTrans selects an available track. For the secondary language, it tries the YouTube track first and falls back to [Chrome Translator](https://developer.chrome.com/docs/ai/translator-api) for supported language pairs. If Chrome prompts for a model download, click **เตรียมตัวแปล**.

Translation highlighting is approximate. Replay uses the time a word appears in the captions, so words shown together may replay from the same point. Videos without captions cannot provide a primary track.

## Data and permissions

YouTrans runs on `www.youtube.com` and reads the player and captions to provide these features. It requests secondary caption tracks from YouTube. When it uses Chrome Translator, translation runs on the device. Chrome may download a language model on first use.

The `storage` permission lets YouTrans keep language preferences, per-video on/off settings, and notebook entries in the current Chrome profile using `chrome.storage.local`. Saved entries can contain caption text, translations, video titles and IDs, and timestamps. The extension has no project-operated server, analytics, or account requirement. You can remove individual entries from the notebook or clear all saved extension data by removing the extension.

## Contributing

Load the working directory as an unpacked extension. After changing code, reload it at `chrome://extensions` and refresh the watch page. For subtitle or player bugs, include the Chrome version, a video URL and timestamp, the selected language pair, and steps to reproduce. Before submitting player changes, check caption display, replay, word saving, and switching between clips. See [AGENTS.md](AGENTS.md) for the project's versioning convention.

## License

YouTrans is available under the [MIT License](LICENSE). You can use, modify, and redistribute it, including commercially, while retaining the copyright and license notices. YouTrans is an independent project. The license covers the project files and does not grant rights to third-party videos or captions.
