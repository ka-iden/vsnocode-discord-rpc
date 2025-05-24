# VSNoCode Discord RPC

An extremely simple, customizable Discord Rich Presence integration for Visual Studio Code. This extension was created by my petty ass to try and fill a gap I saw in the marketplace for something pretty niche.

I made this extension after being frustrated with how overly complex some of the other Discord RPC extensions were. I wanted something as close as visually possible to this [Discord RPC client for Visual Studio by Reavert] as possible, as Visual Studio is my other preferred editor of choice.

This is also why it is named such, as weird as the name is. It's VS (No) Code, because I wanted a relative amount of parity with the extension I use on Visual Studio.

> [!NOTE]
> I didn't use many icons, if there are icons you want used that are not included, feel free to make a pull request or open an issue.

## Features

- Shows your current file, folder, or VS Code version in your Discord status.
- Customizable top and bottom lines (choose file name, folder name, or VS Code version).
- Customizable large and small icons:
  - Show the VS Code logo, file extension icon, or nothing.
  - Hovering over the icon shows the file extension or VS Code version.
- Timer resets based on your chosen mode (file or folder changes).
- Handles Discord restarts and reconnects automatically.

## Extension Settings

This extension contributes the following settings:

| Setting                             | Description                       | Options                                            | Default              |
|-------------------------------------|-----------------------------------|----------------------------------------------------|----------------------|
| `vsnocodeDiscordRPC.largeIcon`      | What to show as the large icon    | `none`, `vscodeVersion`, `fileExtension`           | `vscodeVersion`      |
| `vsnocodeDiscordRPC.smallIcon`      | What to show as the small icon    | `none`, `vscodeVersion`, `fileExtension`           | `none`               |
| `vsnocodeDiscordRPC.topLineText`    | What to render in the top line    | `empty`, `fileName`, `folderName`, `vscodeVersion` | `folderName`         |
| `vsnocodeDiscordRPC.bottomLineText` | What to render in the bottom line | `empty`, `fileName`, `folderName`, `vscodeVersion` | `fileName`           |
| `vsnocodeDiscordRPC.timerMode`      | When to reset the start timer     | `disabled`, `withinFiles`, `withinFolder`          | `withinFolder`       |
| `vsnocodeDiscordRPC.clientId`       | Discord application Client ID     | Your or my Discord Application Client ID           | `123456789012345678` |

## How to Recreate the Extension (Discord Application)

So the name of the program that shows up after "Playing ..." in Discord is set by the Discord application. If you want to set it to something different, for example cursor, you unfortunately need to recreate this extension with your own Discord application, and to do so, I will explain what I did to set this all up.

I stole the [VS Code logo from Wikipedia], as it was the first result on google images.

I took most of the icons from [vscode-icons] and made a few of my own. Note that these are all svgs, so they need to be converted, and I again used the first result on google, [PineTools]. I only used a few of the icons, if there is an icon you want to use that is not included, feel free to make a pull request or open an issue- but remember, they need to be uploaded to the Discord Developer Portal, the [icons folder] is just for reference.

1. Go to the [Discord Developer Portal] and create a new application.
2. Go to the "Rich Presence" > "Art Assets" section.
3. Upload your icons:
   - One thing to mention is that Discord will rate limit you if you upload more than 10 assets at once, so I recommend uploading them in batches of 10 or less.
   - For the VS Code logo, upload an image named `vscode` (case-sensitive, no extension).
   - For file extensions, upload images named after the extension (e.g., `js`, `ts`, `py`).
   - For "none", upload a transparent image named `none`.
4. Copy your application's **Client ID** and replace the `clientId` in the extension settings with your own.

## Notes

- If your icons do not appear, double-check the asset names in the Discord Developer Portal. They must match exactly (case-sensitive, no file extension).
- The extension will attempt to reconnect automatically if Discord is restarted.
- Timer resets are based on your selected mode:
  - **withinFiles**: Resets when you switch, open, or close files.
  - **withinFolder**: Resets when you change workspace folders.

## License

This project is licensed under the [MIT License][LICENSE].  
VS Code is a trademark of Microsoft Corporation. This extension is not affiliated with or endorsed by Microsoft.  
VS Code itself is licensed under the [MIT License][vscode-license].  
vscode-icons is licensed under the [MIT License][vscode-icons-license]

[Discord RPC client for Visual Studio by Reavert]: https://marketplace.visualstudio.com/items?itemName=Ryavel.vsdrp2022
[VS Code logo from Wikipedia]: https://en.m.wikipedia.org/wiki/File:Visual_Studio_Code_1.35_icon.svg
[vscode-icons]: https://github.com/vscode-icons/vscode-icons/tree/master/icons
[PineTools]: https://pinetools.com/bulk-batch-svg-converter-viewer
[icons folder]: icons/
[Discord Developer Portal]: https://discord.com/developers/applications

[LICENSE]: LICENSE
[vscode-license]: https://github.com/microsoft/vscode/blob/main/LICENSE.txt
[vscode-icons-license]: https://github.com/vscode-icons/vscode-icons/blob/master/LICENSE
