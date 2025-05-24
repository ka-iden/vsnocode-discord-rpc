import * as vscode from 'vscode';
import * as DiscordRPC from 'discord-rpc';
import * as path from 'path';

// Discord RPC client instance (IPC transport for local Discord)
const rpc = new DiscordRPC.Client({ transport: 'ipc' });

// Tracks the start time for the current session/timer
let startTime = Date.now();

// Types for extension settings/options
type IconOption    = 'none' | 'vscodeVersion' | 'fileExtension';
type DetailsOption = 'empty' | 'fileName' | 'folderName' | 'vscodeVersion';
type TimerMode     = 'disabled' | 'withinFiles' | 'withinFolder';

// Maps icon options to Discord asset keys (see README for asset setup)
const iconMap: Record<IconOption, string> = {
  none: 'none',
  vscodeVersion: 'vscode',
  fileExtension: '' // handled dynamically in pickIcon
};

// Helper to get extension config with a default value
function getConfig<T>(key: string, def: T): T {
  return vscode.workspace.getConfiguration('vsnocodeDiscordRPC').get<T>(key, def);
}

// Get the Discord Application Client ID from settings, or use mine
// Technically safe to keep here? Cuz it's not the secret or some sort of bot token
// and it doesn't change. Others should be able to use the extension without having
// to set up anything themselves.
function getClientId(): string {
  const configured = vscode.workspace.getConfiguration('vsnocodeDiscordRPC').get<string>('clientId', '');
  // Default clientId is for the public extension; use your own for custom branding
  return configured && configured.trim() !== '' ? configured : '1375810382735740978';
}

// Main function to update Discord Rich Presence
async function setActivity() {
  if (!rpc) return;

  // Get user settings for icons and status lines
  const largeOpt = getConfig<IconOption>('largeIcon', 'vscodeVersion');
  const smallOpt = getConfig<IconOption>('smallIcon', 'none');
  const topOpt   = getConfig<DetailsOption>('topLineText', 'folderName');
  const botOpt   = getConfig<DetailsOption>('bottomLineText', 'fileName');

  // Gather current VS Code context
  const editor    = vscode.window.activeTextEditor;
  const fileName  = editor ? path.basename(editor.document.fileName) : 'No File';
  const fileExt   = editor ? path.extname(editor.document.fileName).replace('.', '').toLowerCase() : '';
  const folder    = vscode.workspace.workspaceFolders?.[0]?.name || 'No Folder';
  const vsVersion = vscode.version;

  // Map for details options (top/bottom lines)
  const detailsMap: Record<DetailsOption, string> = {
    empty: '',
    fileName,
    folderName: folder,
    vscodeVersion: vsVersion
  };

  // Prefixes for each details option
  const prefixMap: Record<DetailsOption, string> = {
    empty: '',
    fileName:      'File ',
    folderName:    'Folder ',
    vscodeVersion: 'VSCode Version '
  };

  // Helper to add prefix unless it's a "No ..." placeholder
  function applyPrefix(opt: DetailsOption, raw?: string): string | undefined {
    if (!raw) return undefined;
    if (raw.startsWith('No ')) return raw;
    return prefixMap[opt] + raw;
  }

  // Prepare top and bottom lines for Discord status
  const topRaw     = topOpt === 'empty' ? undefined : detailsMap[topOpt];
  const botRaw     = botOpt === 'empty' ? undefined : detailsMap[botOpt];
  const topLine    = applyPrefix(topOpt, topRaw);
  const bottomLine = applyPrefix(botOpt, botRaw);

  // Returns the Discord asset key for the icon option
  function pickIcon(opt: IconOption): string | undefined {
    if (opt === 'fileExtension') {
      // Use the file extension as the asset key (must match an uploaded asset)
      return fileExt || undefined;
    }
    if (opt === 'vscodeVersion') {
      // Use the VS Code logo asset
      return 'vscode';
    }
    return iconMap[opt] || undefined;
  }

  // These appear as tooltips when hovering the icons in Discord
  let largeImageText: string | undefined = 'Visual Studio Code';
  if (largeOpt === 'fileExtension' && fileExt) {
    largeImageText = `.${fileExt} file`;
  } else if (largeOpt === 'vscodeVersion') {
    largeImageText = `VSCode ${vsVersion}`;
  }

  let smallImageText: string | undefined = undefined;
  if (smallOpt === 'fileExtension' && fileExt) {
    smallImageText = `.${fileExt} file`;
  } else if (smallOpt === 'vscodeVersion') {
    smallImageText = `VSCode ${vsVersion}`;
  } else if (smallOpt === 'none') {
    smallImageText = undefined; // No invisible small icon, cuz overlap
  }

  // This is what gets sent to Discord for your Rich Presence
  const activity: DiscordRPC.Presence = {
    details:        topLine,
    state:          bottomLine,
    startTimestamp: startTime,
    largeImageKey:  pickIcon(largeOpt),
    smallImageKey:  pickIcon(smallOpt),
    largeImageText,
    smallImageText,
    instance: false
  };

  // Set Discord activity, safely handle errors
  try {
    await rpc.setActivity(activity);
  } catch (err) {
    // Only log the error message to avoid circular structure issues
    console.warn(`Discord RPC setActivity error (ignored): ${err}`);
  }
}

// Handles connecting and reconnecting to Discord RPC
function connectRpc() {
  let reconnectAttempts = 0;
  const maxRetryDelay = 30000; // 30 seconds max

  function attemptConnect() {
    const clientId = getClientId();
    rpc.login({ clientId })
      .then(() => {
        reconnectAttempts = 0;
        console.log('Discord RPC connected successfully');
      })
      .catch(err => {
        reconnectAttempts++;
        // Exponential backoff with max delay
        const delay = Math.min(maxRetryDelay, 1000 * Math.pow(1.5, reconnectAttempts));
        console.error(`Discord RPC login failed: ${err.message}, retry #${reconnectAttempts} in ${Math.round(delay/1000)}s`);
        setTimeout(attemptConnect, delay);
      });
  }
  attemptConnect();
}

// Timer mode logic: controls when the session timer resets
let disposables: vscode.Disposable[] = [];

function setupTimerMode(context: vscode.ExtensionContext) {
  // Dispose old listeners to avoid duplicates
  disposables.forEach(d => d.dispose());
  disposables = [];

  const mode = getConfig<TimerMode>('timerMode', 'withinFolder');

  if (mode === 'withinFiles') {
    // Reset timer when switching files
    let lastFile: string | undefined = vscode.window.activeTextEditor?.document.fileName;

    const resetIfChanged = () => {
      const current = vscode.window.activeTextEditor?.document.fileName;
      if (current !== lastFile) {
        startTime = Date.now();
        context.globalState.update('startTime', startTime);
      }
      lastFile = current;
      setActivity();
    };

    disposables.push(
      vscode.window.onDidChangeActiveTextEditor(resetIfChanged)
    );
    resetIfChanged();
  }

  if (mode === 'withinFolder') {
    // Reset timer when changing workspace folders
    startTime = Date.now();
    context.globalState.update('startTime', startTime);
    setActivity();

    disposables.push(
      vscode.workspace.onDidChangeWorkspaceFolders(() => {
        startTime = Date.now();
        context.globalState.update('startTime', startTime);
        setActivity();
      })
    );
  }
}

// Extension activation: sets up everything on startup
export function activate(context: vscode.ExtensionContext) {
  setupTimerMode(context);

  // Listen for timerMode config changes and re-setup listeners
  vscode.workspace.onDidChangeConfiguration(e => {
    if (e.affectsConfiguration('vsnocodeDiscordRPC.timerMode')) {
      setupTimerMode(context);
    }
  }, null, context.subscriptions);

  // Discord RPC event handlers
  rpc.on('ready', () => {
    setActivity();
    setInterval(setActivity, 5_000); // Update every 5 seconds
    console.log('Discord RPC armed');
  });

  rpc.on('disconnected', () => {
    console.warn('Discord RPC disconnected, reconnecting…');
    connectRpc();
  });

  rpc.on('error', err => {
    console.error(`Discord RPC error: ${err.message}`);
    connectRpc();
  });

  connectRpc();
}

// Extension deactivation: clean up Discord RPC connection
export function deactivate() {
  rpc.destroy();
}
