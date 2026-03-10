import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { BrowserView, BrowserWindow, GlobalShortcut, Screen, Tray, Updater, ffi } from './electrobun-runtime';
import { createFishRpcHandlers } from './fish.js';
import type {
	ElectrobunWindowInteractionState,
	ShellControlActionPayload,
	WebWaifuElectrobunRPC
} from '../lib/electrobun/rpc-schema.js';
import { setWindowClickThrough, refreshWindowHitTest } from './windows-click-through';

const DEV_SERVER_PORT = 5173;
const DEV_SERVER_URL = `http://localhost:${DEV_SERVER_PORT}`;
const MIN_WINDOW_WIDTH = 1280;
const MIN_WINDOW_HEIGHT = 720;

async function getMainViewUrl(): Promise<string> {
	const channel = await Updater.localInfo.channel();
	if (channel === 'dev') {
		try {
			await fetch(DEV_SERVER_URL, { method: 'HEAD' });
			console.log(`HMR enabled: using Vite dev server at ${DEV_SERVER_URL}`);
			return DEV_SERVER_URL;
		} catch {
			console.log('Vite dev server not running. Run "bun run dev:hmr" for HMR.');
		}
	}

	return 'views://mainview/index.html';
}

const url = await getMainViewUrl();
const display = Screen.getPrimaryDisplay();
const displayBounds = display.bounds;
const windowStatePath = resolveWindowStatePath();
let persistWindowStateTimer: ReturnType<typeof setTimeout> | null = null;

type PersistedWindowState = {
	x: number;
	y: number;
	width: number;
	height: number;
};

function resolveWindowStatePath() {
	const appDataRoot =
		Bun.env.APPDATA ||
		Bun.env.LOCALAPPDATA ||
		Bun.env.XDG_CONFIG_HOME ||
		(Bun.env.HOME ? join(Bun.env.HOME, '.config') : process.cwd());

	const dir = join(appDataRoot, 'DesktopWaifu');
	mkdirSync(dir, { recursive: true });
	return join(dir, 'window-state.json');
}

function isValidPersistedWindowState(value: unknown): value is PersistedWindowState {
	if (!value || typeof value !== 'object') return false;
	const frame = value as Record<string, unknown>;
	return ['x', 'y', 'width', 'height'].every((key) => typeof frame[key] === 'number');
}

function getInitialFrame() {
	const fallback = {
		x: displayBounds.x,
		y: displayBounds.y,
		width: displayBounds.width,
		height: displayBounds.height
	};

	if (!existsSync(windowStatePath)) {
		return fallback;
	}

	try {
		const parsed = JSON.parse(readFileSync(windowStatePath, 'utf8'));
		if (!isValidPersistedWindowState(parsed)) {
			return fallback;
		}

		return {
			x: Math.round(parsed.x),
			y: Math.round(parsed.y),
			width: Math.max(MIN_WINDOW_WIDTH, Math.round(parsed.width)),
			height: Math.max(MIN_WINDOW_HEIGHT, Math.round(parsed.height))
		};
	} catch {
		return fallback;
	}
}

function persistWindowState(frame: PersistedWindowState) {
	try {
		writeFileSync(windowStatePath, JSON.stringify(frame, null, 2), 'utf8');
	} catch (error) {
		console.warn('[DesktopWaifu] Failed to persist window state:', error);
	}
}

function schedulePersistWindowState(frame: PersistedWindowState) {
	if (persistWindowStateTimer) {
		clearTimeout(persistWindowStateTimer);
	}
	persistWindowStateTimer = setTimeout(() => {
		persistWindowStateTimer = null;
		persistWindowState(frame);
	}, 150);
}

const initialFrame = getInitialFrame();
const STT_TOGGLE_ACCELERATOR = 'CommandOrControl+Alt+Space';
const RECOVER_CONTROLS_ACCELERATOR = 'CommandOrControl+Alt+M';
const CHAT_TOGGLE_ACCELERATOR = 'F6';

type TrayClickEvent = {
	data?: {
		action?: string;
	};
};

let appRpc: ReturnType<typeof BrowserView.defineRPC<WebWaifuElectrobunRPC>>;
const fishRpcHandlers = createFishRpcHandlers({
	sendAudioChunk(payload) {
		appRpc.send.fishStreamAudioChunk(payload);
	},
	sendComplete(payload) {
		appRpc.send.fishStreamComplete(payload);
	},
	sendError(payload) {
		appRpc.send.fishStreamError(payload);
	}
});

appRpc = BrowserView.defineRPC<WebWaifuElectrobunRPC>({
	handlers: {
		requests: {
			...fishRpcHandlers.requests,
			windowGetFrame() {
				return mainWindow.getFrame();
			},
			windowSetFrame(frame) {
				mainWindow.setFrame(frame.x, frame.y, frame.width, frame.height);
				refreshWindowHitTest(mainWindow.ptr);
				schedulePersistWindowState(frame);
				return { ok: true as const };
			},
			windowStartMove() {
				ffi.request.startWindowMove({ id: mainWindow.id });
				return { ok: true as const };
			},
			windowGetInteractionState() {
				return getWindowInteractionState();
			},
			windowClose() {
				mainWindow.close();
				return { ok: true as const };
			}
		},
		messages: fishRpcHandlers.messages
	}
});

const mainWindow = new BrowserWindow({
	title: 'WEBWAIFU 3',
	url,
	rpc: appRpc,
	frame: initialFrame,
	titleBarStyle: 'hidden',
	transparent: true,
});

let clickThroughEnabled = false;
let alwaysOnTopPreferred = true;

function getWindowInteractionState(): ElectrobunWindowInteractionState {
	return {
		clickThrough: clickThroughEnabled,
		alwaysOnTop: clickThroughEnabled || alwaysOnTopPreferred
	};
}

function sendShellControlAction(payload: ShellControlActionPayload) {
	appRpc.send.shellControlAction(payload);
}

function emitWindowInteractionState() {
	appRpc.send.windowInteractionChanged(getWindowInteractionState());
}

function resolveTrayImage() {
	const devImagePath = join(process.cwd(), 'static', 'assets', 'desktopwaifu-icon.png');
	if (existsSync(devImagePath)) {
		return devImagePath;
	}

	return 'views://mainview/static/assets/desktopwaifu-icon.png';
}

const tray = new Tray({
	title: 'WEBWAIFU 3',
	image: resolveTrayImage(),
	template: false,
	width: 18,
	height: 18,
});

function restoreWindow() {
	if (mainWindow.isMinimized()) {
		mainWindow.unminimize();
	}
	mainWindow.focus();
}

function minimizeToTray() {
	mainWindow.minimize();
}

function syncWindowMode() {
	mainWindow.setAlwaysOnTop(clickThroughEnabled || alwaysOnTopPreferred);
	setWindowClickThrough(mainWindow.ptr, clickThroughEnabled);
	emitWindowInteractionState();
	updateTrayMenu();
}

function applyClickThrough(enabled: boolean, source: 'hotkey' | 'tray' | 'shell' = 'shell') {
	const previous = clickThroughEnabled;
	clickThroughEnabled = enabled;
	syncWindowMode();
	if (previous && !enabled) {
		sendShellControlAction({ action: 'reveal-controls', source });
	}
}

function toggleClickThrough() {
	applyClickThrough(!clickThroughEnabled, 'tray');
}

function applyAlwaysOnTop(enabled: boolean) {
	alwaysOnTopPreferred = enabled;
	syncWindowMode();
}

function toggleAlwaysOnTop() {
	applyAlwaysOnTop(!alwaysOnTopPreferred);
}

function recoverControls(source: 'hotkey' | 'tray' | 'shell' = 'shell') {
	const wasClickThrough = clickThroughEnabled;
	if (clickThroughEnabled) {
		applyClickThrough(false, source);
	}
	restoreWindow();
	if (!wasClickThrough) {
		sendShellControlAction({
			action: 'reveal-controls',
			accelerator: source === 'hotkey' ? RECOVER_CONTROLS_ACCELERATOR : undefined,
			source
		});
	}
}

function registerShortcut(accelerator: string, callback: () => void) {
	if (GlobalShortcut.isRegistered(accelerator)) {
		return;
	}
	const registered = GlobalShortcut.register(accelerator, callback);
	if (!registered) {
		console.warn(`[Electrobun] Failed to register global shortcut: ${accelerator}`);
	}
}

function updateTrayMenu() {
	const minimized = mainWindow.isMinimized();
	const effectiveAlwaysOnTop = clickThroughEnabled || alwaysOnTopPreferred;
	tray.setMenu([
		{
			type: 'normal',
			label: minimized ? 'Restore Window' : 'Minimize to Tray',
			action: minimized ? 'restore-window' : 'minimize-window',
		},
		{
			type: 'normal',
			label: clickThroughEnabled ? 'Disable Click Through' : 'Enable Click Through',
			action: 'toggle-click-through',
			checked: clickThroughEnabled,
		},
		{
			type: 'normal',
			label: clickThroughEnabled
				? 'Always On Top (forced by Click Through)'
				: 'Always On Top',
			action: 'toggle-always-on-top',
			checked: effectiveAlwaysOnTop,
		},
		{ type: 'divider' },
		{
			type: 'normal',
			label: 'Quit',
			action: 'quit-app',
		},
	]);
}

tray.on('tray-clicked', (event) => {
	const action = (event as TrayClickEvent)?.data?.action ?? '';

	switch (action) {
		case '':
		case 'restore-window':
			restoreWindow();
			sendShellControlAction({ action: 'reveal-controls', source: 'tray' });
			break;
		case 'minimize-window':
			minimizeToTray();
			break;
		case 'toggle-click-through':
			toggleClickThrough();
			break;
		case 'toggle-always-on-top':
			toggleAlwaysOnTop();
			break;
		case 'quit-app':
			mainWindow.close();
			return;
		default:
			return;
	}

	updateTrayMenu();
});

mainWindow.on('close', () => {
	if (persistWindowStateTimer) {
		clearTimeout(persistWindowStateTimer);
		persistWindowStateTimer = null;
	}
	try {
		const frame = mainWindow.getFrame();
		persistWindowState(frame);
	} catch {
		// best effort only
	}
	GlobalShortcut.unregisterAll();
	tray.remove();
});

registerShortcut(STT_TOGGLE_ACCELERATOR, () => {
	sendShellControlAction({
		action: 'toggle-stt',
		accelerator: STT_TOGGLE_ACCELERATOR,
		source: 'hotkey'
	});
});

registerShortcut(CHAT_TOGGLE_ACCELERATOR, () => {
	sendShellControlAction({
		action: 'toggle-chat',
		accelerator: CHAT_TOGGLE_ACCELERATOR,
		source: 'hotkey'
	});
});

registerShortcut(RECOVER_CONTROLS_ACCELERATOR, () => {
	recoverControls('hotkey');
});

syncWindowMode();

console.log('WEBWAIFU 3 Electrobun shell started');
console.log('Main window id:', mainWindow.id);
