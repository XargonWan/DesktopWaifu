import { BrowserView, BrowserWindow, Screen, Updater } from './electrobun-runtime';
import { createFishRpcHandlers } from './fish.js';
import type { WebWaifuElectrobunRPC } from '../lib/electrobun/rpc-schema.js';

const DEV_SERVER_PORT = 5173;
const DEV_SERVER_URL = `http://localhost:${DEV_SERVER_PORT}`;

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
const workArea = display.workArea;

function clamp(value: number, min: number, max: number) {
	return Math.min(Math.max(value, min), max);
}

function getInitialFrame() {
	const targetWidth = 1920;
	const targetHeight = 1080;
	const fitScale = Math.min(
		1,
		workArea.width / targetWidth,
		workArea.height / targetHeight
	);
	const width = clamp(Math.round(targetWidth * fitScale), 960, targetWidth);
	const height = clamp(Math.round(targetHeight * fitScale), 700, targetHeight);
	const x = workArea.x + Math.max(0, Math.round((workArea.width - width) * 0.5));
	const y = workArea.y + Math.max(0, Math.round((workArea.height - height) * 0.5));

	return { width, height, x, y };
}

const initialFrame = getInitialFrame();

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
		requests: fishRpcHandlers.requests,
		messages: fishRpcHandlers.messages
	}
});

const mainWindow = new BrowserWindow({
	title: 'WEBWAIFU 3',
	url,
	rpc: appRpc,
	frame: initialFrame,
	transparent: true,
});

console.log('WEBWAIFU 3 Electrobun shell started');
console.log('Main window id:', mainWindow.id);
