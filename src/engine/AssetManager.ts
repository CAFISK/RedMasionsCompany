import type { AssetManifest } from './types';

/**
 * AssetManager - Handles loading, caching, and preloading of all game assets.
 * Supports lazy loading and provides loading progress callbacks.
 */
export class AssetManager {
  private cache: Map<string, HTMLImageElement | HTMLAudioElement | string> = new Map();
  private loading: Map<string, Promise<unknown>> = new Map();
  private manifest: AssetManifest | null = null;
  private basePath = './assets/';

  setBasePath(path: string): void {
    this.basePath = path.endsWith('/') ? path : path + '/';
  }

  setManifest(manifest: AssetManifest): void {
    this.manifest = manifest;
  }

  /**
   * Resolve an asset key to its full URL path
   */
  resolvePath(category: string, key: string): string {
    if (key.startsWith('http://') || key.startsWith('https://') || key.startsWith('data:')) {
      return key;
    }

    // Check manifest first
    if (this.manifest) {
      const cat = this.manifest[category as keyof AssetManifest] as Record<string, string> | undefined;
      if (cat && cat[key]) {
        return this.basePath + cat[key];
      }
    }

    // Convention-based path resolution
    const categoryPaths: Record<string, string> = {
      backgrounds: 'images/backgrounds/',
      characters: 'images/characters/',
      cg: 'images/cg/',
      ui: 'images/ui/',
      bgm: 'audio/bgm/',
      bgs: 'audio/bgs/',
      sfx: 'audio/sfx/',
      voice: 'audio/voice/',
    };

    const prefix = categoryPaths[category] || '';
    return this.basePath + prefix + key;
  }

  /**
   * Load an image and cache it
   */
  async loadImage(src: string): Promise<HTMLImageElement> {
    const cached = this.cache.get(src);
    if (cached instanceof HTMLImageElement) return cached;

    const existing = this.loading.get(src);
    if (existing) return existing as Promise<HTMLImageElement>;

    const promise = new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        this.cache.set(src, img);
        this.loading.delete(src);
        resolve(img);
      };
      img.onerror = () => {
        this.loading.delete(src);
        reject(new Error(`Failed to load image: ${src}`));
      };
      img.src = src;
    });

    this.loading.set(src, promise);
    return promise;
  }

  /**
   * Load a background image by key
   */
  async loadBackground(key: string): Promise<HTMLImageElement> {
    const src = this.resolvePath('backgrounds', key);
    return this.loadImage(src);
  }

  /**
   * Load a character sprite by character ID and expression
   */
  async loadCharacterSprite(characterId: string, expression: string): Promise<HTMLImageElement> {
    const key = `${characterId}/${expression}.png`;
    const src = this.resolvePath('characters', key);
    return this.loadImage(src);
  }

  /**
   * Load a CG image by key
   */
  async loadCG(key: string): Promise<HTMLImageElement> {
    const src = this.resolvePath('cg', key);
    return this.loadImage(src);
  }

  /**
   * Get audio source URL
   */
  getAudioSrc(category: string, key: string): string {
    return this.resolvePath(category, key);
  }

  /**
   * Preload a list of assets
   */
  async preload(
    assets: { category: string; key: string }[],
    onProgress?: (loaded: number, total: number) => void
  ): Promise<void> {
    const total = assets.length;
    let loaded = 0;

    const promises = assets.map(async ({ category, key }) => {
      try {
        if (['backgrounds', 'characters', 'cg', 'ui'].includes(category)) {
          const src = this.resolvePath(category, key);
          await this.loadImage(src);
        }
        // Audio is loaded on-demand by Howler
      } catch (err) {
        console.warn(`[AssetManager] Failed to preload ${category}/${key}:`, err);
      } finally {
        loaded++;
        onProgress?.(loaded, total);
      }
    });

    await Promise.all(promises);
  }

  /**
   * Check if an asset is cached
   */
  isCached(src: string): boolean {
    return this.cache.has(src);
  }

  /**
   * Clear all cached assets
   */
  clearCache(): void {
    this.cache.clear();
    this.loading.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; loading: number } {
    return {
      size: this.cache.size,
      loading: this.loading.size,
    };
  }
}
