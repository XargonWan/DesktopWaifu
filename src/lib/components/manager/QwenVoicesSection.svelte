<script lang="ts">
	type QwenVoiceInfo = {
		id: string;
		name: string;
		has_ref_text?: boolean;
		created_at?: string;
		updated_at?: string;
		active?: boolean;
		built_in?: boolean;
		source?: string;
	};

	let {
		qwenEndpoint,
		qwenVoiceId = $bindable(''),
		qwenBaseVoiceId = $bindable('gpt-sovits-v2pro-default'),
		qwenWaveVoiceId = $bindable('mika')
	}: {
		qwenEndpoint: string;
		qwenVoiceId: string;
		qwenBaseVoiceId: string;
		qwenWaveVoiceId: string;
	} = $props();

	let voices = $state<QwenVoiceInfo[]>([]);
	let loadingVoices = $state(false);
	let serverChecking = $state(false);
	let serverReady = $state(false);
	let serverStatus = $state('Not checked');
	let statusMsg = $state('');

	let uploadName = $state('');
	let uploadRefText = $state('');
	let uploadActivate = $state(true);
	let uploading = $state(false);
	let uploadFileInput = $state<HTMLInputElement | null>(null);

	let cloneName = $state('');
	let cloneActivate = $state(true);
	let cloningPreset = $state(false);

	let refreshTimer: ReturnType<typeof setTimeout> | null = null;

	function isBaseModelVoice(voice: QwenVoiceInfo): boolean {
		return Boolean(voice.built_in) || voice.id === 'gpt-sovits-v2pro-default';
	}

	let baseModelVoices = $derived(voices.filter(isBaseModelVoice));
	let waveSourceVoices = $derived(voices.filter((voice) => !voice.built_in || voice.id !== 'gpt-sovits-v2pro-default'));

	function normalizeEndpoint(): string {
		const raw = (qwenEndpoint || 'http://localhost:8000').trim();
		const withScheme = /^https?:\/\//i.test(raw) ? raw : `http://${raw}`;
		return withScheme.replace(/\/+$/, '');
	}

	async function checkServer() {
		serverChecking = true;
		serverStatus = 'Checking...';
		try {
			const response = await fetch(`${normalizeEndpoint()}/v1/health`);
			if (!response.ok) {
				serverReady = false;
				serverStatus = `HTTP ${response.status}`;
				return;
			}
			const data = await response.json().catch(() => ({}));
			serverReady = Boolean(data?.ok);
			serverStatus = serverReady ? 'Ready' : (data?.last_error || 'Not ready');
			if (data?.active_voice_id) {
				qwenVoiceId = data.active_voice_id;
			}
		} catch (e: any) {
			serverReady = false;
			serverStatus = e?.message || 'Server unreachable';
		} finally {
			serverChecking = false;
		}
	}

	async function loadVoices() {
		loadingVoices = true;
		try {
			const response = await fetch(`${normalizeEndpoint()}/v1/voices`);
			const data = await response.json().catch(() => ({}));
			if (!response.ok) {
				voices = [];
				statusMsg = `Failed to load voices: ${data?.detail || data?.error || response.statusText}`;
				return;
			}
			const loadedVoices = Array.isArray(data?.items) ? data.items : [];
			voices = loadedVoices;
			if (loadedVoices.length > 0) {
				const preferredBase = loadedVoices.find((v: QwenVoiceInfo) => v.id === 'gpt-sovits-v2pro-default')?.id
					|| loadedVoices.find(isBaseModelVoice)?.id
					|| loadedVoices[0]?.id
					|| '';
				const preferredWave = loadedVoices.find((v: QwenVoiceInfo) => v.id === 'mika')?.id
					|| loadedVoices.find((v: QwenVoiceInfo) => v.id !== 'gpt-sovits-v2pro-default')?.id
					|| loadedVoices[0]?.id
					|| '';
				if (!loadedVoices.some((v: QwenVoiceInfo) => v.id === qwenBaseVoiceId && isBaseModelVoice(v))) {
					qwenBaseVoiceId = preferredBase;
				}
				if (!loadedVoices.some((v: QwenVoiceInfo) => v.id === qwenWaveVoiceId) || qwenWaveVoiceId === 'gpt-sovits-v2pro-default') {
					qwenWaveVoiceId = preferredWave;
				}
			}
			const activeVoiceId = data?.active_voice_id || loadedVoices.find((v: QwenVoiceInfo) => v.active)?.id || '';
			if (activeVoiceId) {
				qwenVoiceId = activeVoiceId;
			}
			statusMsg = voices.length > 0 ? `${voices.length} voice preset(s) loaded` : 'No voice presets yet';
		} catch (e: any) {
			voices = [];
			statusMsg = `Failed to load voices: ${e?.message || 'Unknown error'}`;
		} finally {
			loadingVoices = false;
		}
	}

	async function refresh() {
		statusMsg = '';
		await checkServer();
		await loadVoices();
	}

	async function selectVoice(voiceId: string) {
		const id = voiceId.trim();
		if (!id) {
			statusMsg = 'Voice ID is required';
			return;
		}
		statusMsg = '';
		try {
			const response = await fetch(`${normalizeEndpoint()}/v1/voices/select`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ voice_id: id })
			});
			const data = await response.json().catch(() => ({}));
			if (!response.ok) {
				statusMsg = `Select failed: ${data?.detail || data?.error || response.statusText}`;
				return;
			}
			qwenVoiceId = id;
			statusMsg = `Selected: ${data?.voice?.name || id}`;
			await refresh();
		} catch (e: any) {
			statusMsg = `Select failed: ${e?.message || 'Unknown error'}`;
		}
	}

	async function deleteVoice(voiceId: string) {
		statusMsg = '';
		try {
			const response = await fetch(`${normalizeEndpoint()}/v1/voices/${encodeURIComponent(voiceId)}`, {
				method: 'DELETE'
			});
			const data = await response.json().catch(() => ({}));
			if (!response.ok) {
				statusMsg = `Delete failed: ${data?.detail || data?.error || response.statusText}`;
				return;
			}
			if (qwenVoiceId === voiceId) {
				qwenVoiceId = '';
			}
			statusMsg = 'Voice deleted';
			await refresh();
		} catch (e: any) {
			statusMsg = `Delete failed: ${e?.message || 'Unknown error'}`;
		}
	}

	async function uploadVoice() {
		const file = uploadFileInput?.files?.[0];
		if (!uploadName.trim()) {
			statusMsg = 'Voice name is required';
			return;
		}
		if (!file) {
			statusMsg = 'Select an audio file first';
			return;
		}

		uploading = true;
		statusMsg = '';
		try {
			const form = new FormData();
			form.append('name', uploadName.trim());
			form.append('audio_file', file);
			form.append('activate', String(uploadActivate));
			if (uploadRefText.trim()) form.append('ref_text', uploadRefText.trim());
			if (qwenBaseVoiceId.trim()) form.append('base_voice_id', qwenBaseVoiceId.trim());

			const response = await fetch(`${normalizeEndpoint()}/v1/voices/upload`, {
				method: 'POST',
				body: form
			});
			const data = await response.json().catch(() => ({}));
			if (!response.ok) {
				statusMsg = `Upload failed: ${data?.detail || data?.error || response.statusText}`;
				return;
			}
			const selectedId = data?.voice?.id || '';
			if (uploadActivate && selectedId) {
				qwenVoiceId = selectedId;
			}
			uploadName = '';
			uploadRefText = '';
			uploadActivate = true;
			if (uploadFileInput) uploadFileInput.value = '';
			statusMsg = `Uploaded voice: ${data?.voice?.name || selectedId || 'ok'}`;
			await refresh();
		} catch (e: any) {
			statusMsg = `Upload failed: ${e?.message || 'Unknown error'}`;
		} finally {
			uploading = false;
		}
	}

	async function cloneFromPreset() {
		if (!cloneName.trim()) {
			statusMsg = 'Voice name is required';
			return;
		}
		if (!qwenWaveVoiceId.trim()) {
			statusMsg = 'Choose a wave source first';
			return;
		}

		cloningPreset = true;
		statusMsg = '';
		try {
			const response = await fetch(`${normalizeEndpoint()}/v1/voices/clone-preset`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: cloneName.trim(),
					source_voice_id: qwenWaveVoiceId.trim(),
					base_voice_id: qwenBaseVoiceId.trim(),
					activate: cloneActivate,
				})
			});
			const data = await response.json().catch(() => ({}));
			if (!response.ok) {
				statusMsg = `Clone preset failed: ${data?.detail || data?.error || response.statusText}`;
				return;
			}
			const selectedId = data?.voice?.id || '';
			if (cloneActivate && selectedId) {
				qwenVoiceId = selectedId;
			}
			cloneName = '';
			statusMsg = `Created mixed preset: ${data?.voice?.name || selectedId || 'ok'}`;
			await refresh();
		} catch (e: any) {
			statusMsg = `Clone preset failed: ${e?.message || 'Unknown error'}`;
		} finally {
			cloningPreset = false;
		}
	}

	$effect(() => {
		const endpoint = qwenEndpoint.trim();
		if (refreshTimer) {
			clearTimeout(refreshTimer);
			refreshTimer = null;
		}
		if (!endpoint) {
			voices = [];
			serverReady = false;
			serverStatus = 'Missing endpoint';
			return;
		}
		refreshTimer = setTimeout(() => {
			void refresh();
		}, 350);

		return () => {
			if (refreshTimer) {
				clearTimeout(refreshTimer);
				refreshTimer = null;
			}
		};
	});

</script>

<div class="section-card">
	<div class="section-header">
		<h2 class="section-title">Genie Voice Presets</h2>
	</div>

	<div class="sub-section">
		<div class="row">
			<h3 class="sub-title">Server Status</h3>
			<button class="btn-init" onclick={refresh} disabled={serverChecking || loadingVoices}>
				{serverChecking || loadingVoices ? 'Refreshing...' : 'Refresh'}
			</button>
		</div>
		<div class="status-row">
			<span class:ok={serverReady} class:bad={!serverReady}>{serverStatus}</span>
			<small class="hint">{normalizeEndpoint()}</small>
		</div>
	</div>

	<div class="sub-section">
		<h3 class="sub-title">Base Model</h3>
		<select class="input-tech" bind:value={qwenBaseVoiceId}>
			{#each baseModelVoices as voice}
				<option value={voice.id}>{voice.name}{voice.built_in ? ' (built-in)' : ''}</option>
			{/each}
		</select>
		<small class="hint">Pick the base GPT-SoVITS / Genie model you want to synthesize with.</small>
	</div>

	<div class="sub-section">
		<h3 class="sub-title">Wave Source</h3>
		<select class="input-tech" bind:value={qwenWaveVoiceId}>
			{#each waveSourceVoices as voice}
				<option value={voice.id}>{voice.name}{voice.built_in ? ' (built-in prompt)' : ''}</option>
			{/each}
		</select>
		<small class="hint">Pick the stored reference WAV/text source you want to pair with the base model.</small>
	</div>

	<div class="sub-section">
		<h3 class="sub-title">Saved Presets</h3>
		{#if voices.length === 0}
			<small class="hint">No Genie presets found.</small>
		{:else}
			<div class="voice-list">
				{#each voices as voice}
					<div class="voice-row" class:active={qwenVoiceId === voice.id || voice.active}>
						<div class="voice-info">
							<span class="voice-name">{voice.name}</span>
							<span class="voice-id">{voice.id}</span>
							<div class="voice-tags">
								{#if qwenVoiceId === voice.id || voice.active}
									<span class="voice-tag active-tag">active</span>
								{/if}
								{#if qwenBaseVoiceId === voice.id}
									<span class="voice-tag base-tag">base model</span>
								{/if}
								{#if qwenWaveVoiceId === voice.id}
									<span class="voice-tag wave-tag">wave source</span>
								{/if}
								{#if voice.built_in}
									<span class="voice-tag built-in-tag">built-in</span>
								{/if}
								{#if voice.source === 'upload'}
									<span class="voice-tag upload-tag">uploaded wave</span>
								{:else if voice.source === 'preset-clone'}
									<span class="voice-tag clone-tag">mixed preset</span>
								{/if}
							</div>
						</div>
						<div class="voice-actions">
							<button class="btn-small" onclick={() => selectVoice(voice.id)}>Select</button>
							{#if !voice.built_in}
								<button class="btn-small danger" onclick={() => deleteVoice(voice.id)}>Delete</button>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>

	<div class="sub-section">
		<h3 class="sub-title">Upload Wave Preset</h3>
		<input type="text" class="input-tech" bind:value={uploadName} placeholder="Wave preset name..." />
		<input type="text" class="input-tech" bind:value={uploadRefText} placeholder="Reference text (optional, auto-transcribes if empty)" />
		<div class="toggle-row">
			<label>
				<input type="checkbox" bind:checked={uploadActivate} />
				activate
			</label>
		</div>
		<input
			type="file"
			class="file-picker"
			accept="audio/*,.wav,.mp3,.flac,.m4a"
			bind:this={uploadFileInput}
		/>
		<button class="btn-tech" onclick={uploadVoice} disabled={uploading}>
			{uploading ? 'Uploading...' : 'Upload Wave Preset'}
		</button>
		<small class="hint">This stores a reusable reference WAV/text preset. It will use the selected base model above when created.</small>
	</div>

	<div class="sub-section">
		<h3 class="sub-title">Create Mixed Preset</h3>
		<input type="text" class="input-tech" bind:value={cloneName} placeholder="New mixed preset name..." />
		<div class="toggle-row">
			<label>
				<input type="checkbox" bind:checked={cloneActivate} />
				activate
			</label>
		</div>
		<button class="btn-tech" onclick={cloneFromPreset} disabled={cloningPreset}>
			{cloningPreset ? 'Creating...' : 'Create Mixed Preset'}
		</button>
		<small class="hint">This combines the selected base model above with the selected wave source above. No path fields, no manual ids.</small>
	</div>

	{#if statusMsg}
		<div class="status-msg">{statusMsg}</div>
	{/if}
</div>

<style>
	.section-card {
		background: var(--c-panel, rgba(13,17,23,0.95));
		border: 1px solid var(--c-border);
		padding: 20px;
		overflow: hidden;
	}
	@media (max-width: 500px) {
		.section-card { padding: 14px; }
	}
	.section-title {
		font-family: var(--font-tech);
		font-size: 0.8rem;
		text-transform: uppercase;
		letter-spacing: 0.15em;
		color: var(--c-text-accent);
		margin: 0;
	}
	.section-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		margin-bottom: 16px;
	}
	.sub-title {
		font-family: var(--font-tech);
		font-size: 0.7rem;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: var(--text-muted);
		margin: 0;
	}
	.sub-section {
		margin-bottom: 16px;
		padding-bottom: 16px;
		border-bottom: 1px dashed var(--c-border);
	}
	.sub-section:last-of-type { border-bottom: none; }
	.row {
		display: flex;
		gap: 8px;
		align-items: center;
		flex-wrap: wrap;
	}
	.status-row {
		display: flex;
		flex-direction: column;
		gap: 4px;
		margin-top: 8px;
	}
	.ok { color: var(--success); font-size: 0.8rem; }
	.bad { color: rgba(255,80,80,1); font-size: 0.8rem; }
	.input-tech {
		width: 100%;
		min-width: 0;
		background: rgba(0,0,0,0.4);
		border: 1px solid var(--c-border);
		color: var(--text-main);
		padding: 8px 10px;
		font-size: 0.8rem;
		font-family: var(--font-ui);
		transition: border-color 0.2s;
	}
	.input-tech:focus { outline: none; border-color: var(--c-text-accent); }
	.btn-init {
		padding: 8px 14px;
		background: var(--c-text-accent);
		border: none;
		color: #000;
		font-family: var(--font-tech);
		font-size: 0.7rem;
		text-transform: uppercase;
		cursor: pointer;
		white-space: nowrap;
		transition: opacity 0.2s;
	}
	.btn-init:hover { opacity: 0.8; }
	.btn-init:disabled { opacity: 0.4; cursor: not-allowed; }
	.btn-tech {
		width: 100%;
		padding: 10px;
		background: transparent;
		border: 1px solid var(--c-text-accent);
		color: var(--c-text-accent);
		font-family: var(--font-tech);
		font-size: 0.75rem;
		text-transform: uppercase;
		cursor: pointer;
		transition: all 0.2s;
	}
	.btn-tech:hover { background: var(--c-text-accent); color: #000; }
	.btn-tech:disabled { opacity: 0.4; cursor: not-allowed; }
	.voice-list {
		margin-top: 8px;
		border: 1px solid var(--c-border);
		max-height: 250px;
		overflow-y: auto;
	}
	.voice-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 8px 12px;
		border-bottom: 1px solid rgba(255,255,255,0.03);
		transition: background 0.15s;
	}
	.voice-row:hover { background: rgba(56,189,248,0.03); }
	.voice-row.active { background: rgba(56,189,248,0.08); border-left: 2px solid var(--c-text-accent); }
	.voice-info { display: flex; flex-direction: column; gap: 2px; min-width: 0; flex: 1; }
	.voice-name { font-size: 0.8rem; color: var(--text-main); overflow: hidden; text-overflow: ellipsis; }
	.voice-id { font-size: 0.65rem; color: var(--text-muted); font-family: var(--font-tech); }
	.voice-tags {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		margin-top: 6px;
	}
	.voice-tag {
		padding: 2px 6px;
		border: 1px solid rgba(67, 165, 255, 0.35);
		background: rgba(0,0,0,0.24);
		color: var(--c-text-accent);
		font-size: 0.58rem;
		font-family: var(--font-tech);
		text-transform: uppercase;
		letter-spacing: 0.1em;
	}
	.active-tag { border-color: rgba(84, 241, 178, 0.45); color: #8bffd0; }
	.base-tag { border-color: rgba(87, 186, 255, 0.45); color: #8bd7ff; }
	.wave-tag { border-color: rgba(211, 145, 255, 0.4); color: #e0b6ff; }
	.built-in-tag { border-color: rgba(255, 218, 128, 0.35); color: #ffd98a; }
	.upload-tag { border-color: rgba(104, 227, 194, 0.38); color: #8bf7d6; }
	.clone-tag { border-color: rgba(255, 148, 112, 0.4); color: #ffb89c; }
	.voice-actions { display: flex; gap: 4px; }
	.btn-small {
		padding: 3px 8px;
		background: transparent;
		border: 1px solid var(--c-border);
		color: var(--text-muted);
		font-family: var(--font-tech);
		font-size: 0.6rem;
		text-transform: uppercase;
		cursor: pointer;
		transition: all 0.2s;
	}
	.btn-small:hover { border-color: var(--c-text-accent); color: var(--c-text-accent); }
	.btn-small.danger:hover { border-color: rgba(255,80,80,0.8); color: rgba(255,80,80,1); }
	.toggle-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 12px;
		margin: 6px 0;
	}
	.toggle-row label {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 0.72rem;
		color: var(--text-muted);
		font-family: var(--font-tech);
	}
	.hint { color: var(--text-muted); font-size: 0.7rem; display: block; margin-top: 4px; }
	.status-msg {
		margin-top: 12px;
		font-size: 0.7rem;
		font-family: var(--font-tech);
		color: var(--text-muted);
		padding: 6px 10px;
		background: rgba(0,0,0,0.3);
		border-left: 2px solid var(--c-text-accent);
	}
	.file-picker {
		width: 100%;
		min-width: 0;
		padding: 8px 10px;
		background: rgba(0,0,0,0.35);
		border: 1px solid var(--c-border);
		color: var(--text-muted);
		font-size: 0.75rem;
		font-family: var(--font-ui);
		box-sizing: border-box;
	}
	@media (max-width: 500px) {
		.voice-row { flex-direction: column; align-items: flex-start; gap: 6px; }
		.voice-actions { width: 100%; justify-content: flex-start; }
		.section-header { align-items: flex-start; flex-direction: column; }
	}
</style>
