import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass.js';
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js';
import { TAARenderPass } from 'three/examples/jsm/postprocessing/TAARenderPass.js';
import { OutlineEffect } from 'three/examples/jsm/effects/OutlineEffect.js';
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader.js';
import { BleachBypassShader } from 'three/examples/jsm/shaders/BleachBypassShader.js';
import { ColorCorrectionShader } from 'three/examples/jsm/shaders/ColorCorrectionShader.js';
import { getRenderPixelRatio, getViewportSize, isDesktopShell } from './scene.js';

export interface PostProcessingRefs {
	composer: EffectComposer;
	outlineEffect: OutlineEffect;
	bloomPass: UnrealBloomPass;
	fxaaPass: ShaderPass;
	smaaPass: SMAAPass;
	taaPass: TAARenderPass;
	outlinePass: OutlinePass;
	bleachBypassPass: ShaderPass;
	colorCorrectionPass: ShaderPass;
}

export function initPostProcessing(
	renderer: THREE.WebGLRenderer,
	scene: THREE.Scene,
	camera: THREE.PerspectiveCamera
): PostProcessingRefs {
	const { width, height } = getViewportSize(renderer.domElement);
	const outlineEffect = new OutlineEffect(renderer, {
		defaultThickness: 0.003,
		defaultColor: [0, 0, 0],
		defaultAlpha: 0.8,
		defaultKeepAlive: true
	});

	const composer = new EffectComposer(renderer);
	composer.setPixelRatio(getRenderPixelRatio());
	composer.setSize(width, height);

	const renderPass = new RenderPass(scene, camera);
	renderPass.clearAlpha = isDesktopShell() ? 0 : 1;
	composer.addPass(renderPass);

	const bloomPass = new UnrealBloomPass(
		new THREE.Vector2(width, height),
		0.4,
		0.6,
		0.7
	);
	bloomPass.enabled = false;
	composer.addPass(bloomPass);

	const outlinePass = new OutlinePass(
		new THREE.Vector2(width, height),
		scene,
		camera
	);
	outlinePass.edgeStrength = 3.0;
	outlinePass.edgeGlow = 0.5;
	outlinePass.edgeThickness = 1.5;
	outlinePass.visibleEdgeColor.set('#38bdf8');
	outlinePass.hiddenEdgeColor.set('#1e293b');
	outlinePass.enabled = false;
	composer.addPass(outlinePass);

	const bleachBypassPass = new ShaderPass(BleachBypassShader);
	bleachBypassPass.uniforms['opacity'].value = 0.2;
	bleachBypassPass.enabled = false;
	composer.addPass(bleachBypassPass);

	const colorCorrectionPass = new ShaderPass(ColorCorrectionShader);
	colorCorrectionPass.uniforms['powRGB'].value.set(1.4, 1.45, 1.45);
	colorCorrectionPass.uniforms['mulRGB'].value.set(1.1, 1.1, 1.1);
	colorCorrectionPass.enabled = false;
	composer.addPass(colorCorrectionPass);

	const pixelRatio = renderer.getPixelRatio();
	const fxaaPass = new ShaderPass(FXAAShader);
	fxaaPass.material.uniforms['resolution'].value.x = 1 / (width * pixelRatio);
	fxaaPass.material.uniforms['resolution'].value.y = 1 / (height * pixelRatio);
	fxaaPass.enabled = false;
	composer.addPass(fxaaPass);

	const smaaPass = new SMAAPass();
	smaaPass.setSize(width * pixelRatio, height * pixelRatio);
	smaaPass.enabled = false;
	composer.addPass(smaaPass);

	const taaPass = new TAARenderPass(scene, camera);
	taaPass.enabled = false;
	taaPass.sampleLevel = 2;

	const outputPass = new OutputPass();
	composer.addPass(outputPass);

	return {
		composer,
		outlineEffect,
		bloomPass,
		fxaaPass,
		smaaPass,
		taaPass,
		outlinePass,
		bleachBypassPass,
		colorCorrectionPass
	};
}

export function resizePostProcessing(
	refs: PostProcessingRefs,
	renderer: THREE.WebGLRenderer
) {
	const { width: w, height: h } = getViewportSize(renderer.domElement);
	const { composer, fxaaPass, bloomPass, smaaPass, outlinePass } = refs;
	composer.setPixelRatio(getRenderPixelRatio());
	composer.setSize(w, h);

	const pixelRatio = renderer.getPixelRatio();
	if (fxaaPass) {
		fxaaPass.material.uniforms['resolution'].value.x = 1 / (w * pixelRatio);
		fxaaPass.material.uniforms['resolution'].value.y = 1 / (h * pixelRatio);
	}
	if (bloomPass) {
		bloomPass.resolution.set(w, h);
	}
	if (smaaPass) {
		smaaPass.setSize(w * pixelRatio, h * pixelRatio);
	}
	if (outlinePass) {
		outlinePass.setSize(w, h);
	}
}
