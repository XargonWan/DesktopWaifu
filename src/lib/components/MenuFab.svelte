<script lang="ts">
	import { getElectrobunRpc } from '$lib/electrobun/bridge.js';
	let { visible = true }: { visible?: boolean } = $props();

	async function closeApp() {
		try {
			const rpc = await getElectrobunRpc();
			if (rpc) {
				await rpc.request.windowClose({});
			}
		} catch {
			window.close();
		}
	}
</script>

<button
	id="menu-fab"
	class:visible={visible}
	title="Close"
	onmousedown={(e) => { e.stopPropagation(); e.stopImmediatePropagation(); }}
	onpointerdown={(e) => { e.stopPropagation(); e.stopImmediatePropagation(); }}
	onclick={(e) => { e.stopPropagation(); closeApp(); }}
>
	<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
		<line x1="18" y1="6" x2="6" y2="18"></line>
		<line x1="6" y1="6" x2="18" y2="18"></line>
	</svg>
</button>

<style>
	#menu-fab {
		position: absolute;
		top: var(--desktop-top-gap, 24px);
		right: var(--desktop-edge-gap, 24px);
		width: var(--desktop-icon-size, 48px);
		height: var(--desktop-icon-size, 48px);
		min-width: 44px;
		min-height: 44px;
		background: var(--c-panel);
		border: 1px solid var(--c-border);
		color: var(--text-main);
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		z-index: 9999;
		opacity: 0;
		visibility: hidden;
		pointer-events: none;
		transition: opacity 0.2s, visibility 0.2s;
	}
	#menu-fab.visible {
		opacity: 1;
		visibility: visible;
		pointer-events: auto;
	}
	#menu-fab:hover { color: var(--danger, #f43f5e); border-color: var(--danger, #f43f5e); }
	#menu-fab svg {
		width: 20px;
		height: 20px;
	}
	@media (max-width: 900px) {
		#menu-fab {
			top: calc(clamp(12px, 2vh, 24px) + var(--safe-top, 0px));
			right: calc(clamp(12px, 2vw, 24px) + var(--safe-right, 0px));
		}
	}
</style>
