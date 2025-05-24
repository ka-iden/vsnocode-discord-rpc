import * as vscode from 'vscode';
import * as DiscordRPC from 'discord-rpc';
import * as path from 'path';

const clientId = '1375810382735740978';
const rpc      = new DiscordRPC.Client({ transport: 'ipc' });
let startTime  = Date.now();

type IconOption    = 'none' | 'vscodeVersion';
type DetailsOption = 'empty' | 'fileName' | 'folderName' | 'vscodeVersion';
type TimerMode     = 'disabled' | 'withinFiles' | 'withinFolder';

const iconMap: Record<IconOption, string> = {
  none: '',
  vscodeVersion: 'vscode'
};

function getConfig<T>(key: string, def: T): T {
  return vscode.workspace.getConfiguration('vsnocodeDiscordRPC').get<T>(key, def);
}

async function setActivity() {
  if (!rpc) return;

  const largeOpt = getConfig<IconOption>('largeIcon','vscodeVersion');
  const smallOpt = getConfig<IconOption>('smallIcon','none');
  const topOpt   = getConfig<DetailsOption>('topLineText','folderName');
  const botOpt   = getConfig<DetailsOption>('bottomLineText','fileName');

  const editor   = vscode.window.activeTextEditor;
  const fileName = editor ? path.basename(editor.document.fileName) : 'No File';
  const folder   = vscode.workspace.workspaceFolders?.[0]?.name || 'No Folder';
  const vsVersion= vscode.version;

  const detailsMap: Record<DetailsOption,string> = {
    empty: '',
    fileName,
    folderName: folder,
    vscodeVersion: vsVersion
  };

  const prefixMap: Record<DetailsOption,string> = {
    empty: '',
    fileName:      'File ',
    folderName:    'Folder ',
    vscodeVersion: 'VSCode Version '
  };

  function applyPrefix(opt: DetailsOption, raw?: string): string|undefined {
    if (!raw) return undefined;
    if (raw.startsWith('No ')) return raw;
    return prefixMap[opt] + raw;
  }

  const topRaw     = topOpt === 'empty' ? undefined : detailsMap[topOpt];
  const botRaw     = botOpt === 'empty' ? undefined : detailsMap[botOpt];
  const topLine    = applyPrefix(topOpt, topRaw);
  const bottomLine = applyPrefix(botOpt, botRaw);

  const activity: DiscordRPC.Presence = {
    details:        topLine,
    state:          bottomLine,
    startTimestamp: startTime,
    largeImageKey:  iconMap[largeOpt] || undefined,
    smallImageKey:  iconMap[smallOpt] || undefined,
    largeImageText: 'Visual Studio Code',
    instance:       false
  };

  // catch any rejection from setActivity to avoid unhandled promise
  try {
    await rpc.setActivity(activity);
  } catch (err) {
    // Safe error logging - only use the message
    console.warn(`Discord RPC setActivity error (ignored): ${err}`);
  }
}

function connectRpc() {
  let reconnectAttempts = 0;
  const maxRetryDelay = 30000; // 30 seconds max

  function attemptConnect() {
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

// Add at the top, after your imports
let disposables: vscode.Disposable[] = [];

function setupTimerMode(context: vscode.ExtensionContext) {
  // Dispose old listeners
  disposables.forEach(d => d.dispose());
  disposables = [];

  const mode = getConfig<TimerMode>('timerMode', 'withinFolder');

  if (mode === 'withinFiles') {
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

// ─── ACTIVATE ─────────────────────────────────────────────────────────────────
export function activate(context: vscode.ExtensionContext) {
  setupTimerMode(context);

  // Listen for timerMode config changes
  vscode.workspace.onDidChangeConfiguration(e => {
    if (e.affectsConfiguration('vsnocodeDiscordRPC.timerMode')) {
      setupTimerMode(context);
    }
  }, null, context.subscriptions);

  rpc.on('ready', () => {
    setActivity();
    setInterval(setActivity, 5_000);
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

// ─── DEACTIVATE ───────────────────────────────────────────────────────────────
export function deactivate() {
  rpc.destroy();
}
