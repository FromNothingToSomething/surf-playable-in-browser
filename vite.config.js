import { defineConfig } from 'vite';
// assetsInlineLimit élevé: les modèles .glb sont intégrés (base64) pour la version fichier unique.
export default defineConfig({ server: { host: true }, assetsInclude: ['**/*.glb'], build: { assetsInlineLimit: 100 * 1024 * 1024, chunkSizeWarningLimit: 8000 } });
