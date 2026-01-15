<script lang="ts">
  import { Canvas } from '@threlte/core';
  import Scene from './components/Scene.svelte';
  import UI from './components/UI.svelte';
</script>

<div class="relative w-screen h-screen overflow-hidden bg-slate-900">
  <Canvas>
    <Scene />
  </Canvas>

  <!-- HTML UI Overlay -->
  <div class="absolute inset-0 pointer-events-none">
    <UI />
  </div>
</div>

<style>
  :global(body) {
    margin: 0;
    overflow: hidden;
  }
</style>
