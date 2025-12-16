# Invisible mode for WhatsApp Web
This is the source code of a chrome extension that disables read receipts and presence updates on WhatsApp Web.
You can find the original extension in [Chrome Web Store](https://chrome.google.com/webstore/detail/waincognito/alhmbbnlcggfcjjfihglopfopcbigmil).


![image](https://user-images.githubusercontent.com/11458759/226142143-70a7bbbd-2f20-4b0d-9a19-ce2342edbae5.png)

## Notable Features
- Block "read" receipts sending, and decide when to send them later (works for statuses as well)
- Block "typing"/"seen" updates (Will prevent you from seeing others')
- **Online Presence Tracker**:
  - Track when selected users go online/offline.
  - **Timeline View**: Visual graph to compare online activity of multiple users over 24h, 3 days, or more.
  - View detailed logs of online sessions with duration and "Last Seen" info.
  - **Stay Online**: Optional feature to keep your own presence as "Online" indefinitely.
- **Activity & Typing Logs**:
  - Get notified when specific users start typing (System & In-App Toast notifications).
  - Manage "exclusions" to mute typing notifications for specific users.
  - View history of typing activities.
- Always restore deleted messages of all kinds
- See whether every message was sent from a phone or a computer
- Download statuses
- Capture and view view-once messages (images, videos, audio)

## Installing from GitHub directly
To install the extension off-store, download the latest release as a zip file from the [Releases](https://github.com/tomer8007/whats-incognito/releases) page, or better, just clone the source code
**to a directory** and add it to Chrome using the 'Load unpacked extension' option when developer mode is turned on.

## How it works
This extension works by intercepting the WebSocket frames between chrome and WhatsApp's servers using a modified `WebSocket` constructor (see [wsHook](https://github.com/skepticfx/wshook)).

Those frames are then decrypted if needed using local encryption keys, and decoded from their binary XMPP form using a javascript code from WhatsApp's original implementation.

The resulting "stanzas" are then simply checked to see if WhatsApp tries to send out a `read` or `presence` action, and if so, the extension blocks it and fakes a failure response from the server.

## Organization & Internals
The main code of the extension is located in `core/interception.js` and in `core/ui.js`. 

Other files inside the `core` folder deal with the infrastructure that makes the interception and the decoding works. There is also an additional `parsing/` code for parsing messages (such as `message_types.js`) that is rarely used in the extension.
`background.js` mainly keeps track of the saved preferences using `localStorage`.

If you want to see what kind of messages WhatsApp is sending and receiving over WebSocket in real-time, you can type `WAdebugMode = true` in the javascript console. Incoming and outgoing payloads (after decryption) will be printed out.

## MacOS Support (Safari)
To run this extension on macOS (Safari), you can convert it using Xcode's command line tools:

1. Ensure you have **Xcode** installed.
2. Run the following command in your terminal:
   ```bash
   xcrun safari-web-extension-converter /path/to/whatsapp-web-incognito
   ```
3. Xcode will open a new project with the converted extension.
4. Run the project in Xcode to build and install the extension in Safari.

## Privacy
No data is ever transmitted to anywhere. Privacy policy [here](https://github.com/tomer8007/whatsapp-web-incognito/wiki/Chrome-Extension-Privacy-Policy).