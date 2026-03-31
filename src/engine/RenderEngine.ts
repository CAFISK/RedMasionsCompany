import { AssetManager } from './AssetManager';
import { EventBus } from './EventBus';
import type {
  CharacterConfig,
  CharacterPosition,
  CharacterState,
  TransitionConfig,
  GameSettings,
} from './types';

/**
 * Position mapping for named character positions (based on 1280x720 resolution)
 */
const POSITION_MAP: Record<string, { x: number; y: number }> = {
  far_left: { x: 0.1, y: 0.5 },
  left: { x: 0.25, y: 0.5 },
  center: { x: 0.5, y: 0.5 },
  right: { x: 0.75, y: 0.5 },
  far_right: { x: 0.9, y: 0.5 },
};

/**
 * RenderEngine - Manages all visual rendering using DOM + CSS.
 * Handles backgrounds, characters, transitions, weather effects, and screen effects.
 */
export class RenderEngine {
  private container: HTMLElement;
  private bgLayer!: HTMLElement;
  private characterLayer!: HTMLElement;
  private fxLayer!: HTMLElement;
  private uiLayer!: HTMLElement;

  private currentBgElement: HTMLElement | null = null;
  private characterElements: Map<string, HTMLElement> = new Map();
  private weatherElement: HTMLElement | null = null;
  private cinematicBars: { top: HTMLElement; bottom: HTMLElement } | null = null;

  private width = 1280;
  private height = 720;

  constructor(
    containerId: string,
    private assetManager: AssetManager,
    private eventBus: EventBus
  ) {
    const el = document.getElementById(containerId);
    if (!el) throw new Error(`Container element #${containerId} not found`);
    this.container = el;
    this.initLayers();
    this.initResize();
  }

  /**
   * Initialize rendering layers
   */
  private initLayers(): void {
    this.container.style.cssText = `
      position: relative;
      width: 100%;
      max-width: ${this.width}px;
      aspect-ratio: ${this.width} / ${this.height};
      margin: 0 auto;
      overflow: hidden;
      background: #000;
      user-select: none;
      -webkit-user-select: none;
    `;

    // Background layer
    this.bgLayer = this.createLayer('vn-bg-layer', 0);
    // Character layer
    this.characterLayer = this.createLayer('vn-char-layer', 10);
    // Effects layer (weather, screen effects)
    this.fxLayer = this.createLayer('vn-fx-layer', 20);
    // UI layer (dialogue box, choices, menus)
    this.uiLayer = this.createLayer('vn-ui-layer', 30);
  }

  private createLayer(id: string, zIndex: number): HTMLElement {
    const layer = document.createElement('div');
    layer.id = id;
    layer.style.cssText = `
      position: absolute;
      top: 0; left: 0;
      width: 100%; height: 100%;
      z-index: ${zIndex};
      pointer-events: none;
    `;
    this.container.appendChild(layer);
    return layer;
  }

  /**
   * Handle responsive resizing
   */
  private initResize(): void {
    const resize = () => {
      const parentWidth = this.container.parentElement?.clientWidth || window.innerWidth;
      const parentHeight = this.container.parentElement?.clientHeight || window.innerHeight;
      const scale = Math.min(parentWidth / this.width, parentHeight / this.height);
      const w = this.width * scale;
      const h = this.height * scale;
      this.container.style.width = `${w}px`;
      this.container.style.height = `${h}px`;
    };
    window.addEventListener('resize', resize);
    resize();
  }

  /**
   * Get the UI layer element for UI components to attach to
   */
  getUILayer(): HTMLElement {
    return this.uiLayer;
  }

  /**
   * Get the container element
   */
  getContainer(): HTMLElement {
    return this.container;
  }

  // --- Background ---

  /**
   * Set background image with optional transition
   */
  async setBackground(imageKey: string, transition?: TransitionConfig): Promise<void> {
    const src = this.assetManager.resolvePath('backgrounds', imageKey);

    // Preload the image before applying it as CSS background to prevent black screen
    await this.preloadImage(src);

    const newBg = document.createElement('div');
    newBg.className = 'vn-background';
    newBg.style.cssText = `
      position: absolute;
      top: 0; left: 0;
      width: 100%; height: 100%;
      background-image: url('${src}');
      background-size: cover;
      background-position: center;
      z-index: 0;
    `;

    if (transition && transition.type !== 'none') {
      const duration = transition.duration || 500;
      newBg.style.opacity = '0';
      this.bgLayer.appendChild(newBg);

      // Animate transition
      await this.animateTransition(newBg, this.currentBgElement, transition);
    } else {
      this.bgLayer.appendChild(newBg);
    }

    // Remove old background
    if (this.currentBgElement) {
      this.currentBgElement.remove();
    }
    this.currentBgElement = newBg;
  }

  /**
   * Preload an image to ensure it's cached before use.
   * Returns immediately if the image is already cached.
   */
  private preloadImage(src: string): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      const img = new Image();
      img.onload = () => resolve(true);
      img.onerror = () => {
        console.warn(`[RenderEngine] Failed to preload image: ${src}`);
        resolve(false);
      };
      img.src = src;
    });
  }

  /**
   * Resolve character sprite path with fallback to 'normal' expression.
   * Returns the resolved src string that is confirmed loadable.
   */
  private async resolveCharacterSprite(
    characterId: string,
    expression: string,
    config: CharacterConfig
  ): Promise<string> {
    // Try the requested expression first
    const rawSrc = config.sprites.expressions[expression] || config.sprites.base;
    const spriteSrc = rawSrc
      ? this.assetManager.resolvePath('characters', rawSrc)
      : this.assetManager.resolvePath('characters', `${characterId}/${expression}.png`);

    const src = typeof spriteSrc === 'string' ? spriteSrc : '';
    if (src) {
      const ok = await this.preloadImage(src);
      if (ok) return src;
    }

    // Fallback to 'normal' expression if the requested one doesn't exist
    if (expression !== 'normal') {
      console.warn(`[RenderEngine] Expression '${expression}' not found for '${characterId}', falling back to 'normal'`);
      const normalRaw = config.sprites.expressions['normal'] || config.sprites.base;
      const normalSrc = normalRaw
        ? this.assetManager.resolvePath('characters', normalRaw)
        : this.assetManager.resolvePath('characters', `${characterId}/normal.png`);
      const normalStr = typeof normalSrc === 'string' ? normalSrc : '';
      if (normalStr) {
        const ok = await this.preloadImage(normalStr);
        if (ok) return normalStr;
      }
    }

    // Last resort: return original src even if it failed
    console.warn(`[RenderEngine] No valid sprite found for '${characterId}', using original path`);
    return src;
  }

  /**
   * Animate a transition between old and new elements
   */
  private async animateTransition(
    newEl: HTMLElement,
    oldEl: HTMLElement | null,
    transition: TransitionConfig
  ): Promise<void> {
    const duration = transition.duration || 500;

    return new Promise<void>((resolve) => {
      switch (transition.type) {
        case 'fade':
          newEl.style.transition = `opacity ${duration}ms ease`;
          requestAnimationFrame(() => {
            newEl.style.opacity = '1';
            if (oldEl) {
              oldEl.style.transition = `opacity ${duration}ms ease`;
              oldEl.style.opacity = '0';
            }
          });
          break;

        case 'dissolve':
          newEl.style.transition = `opacity ${duration}ms ease`;
          requestAnimationFrame(() => {
            newEl.style.opacity = '1';
          });
          break;

        case 'slide_left':
          newEl.style.transform = 'translateX(100%)';
          newEl.style.opacity = '1';
          newEl.style.transition = `transform ${duration}ms ease`;
          requestAnimationFrame(() => {
            newEl.style.transform = 'translateX(0)';
          });
          break;

        case 'slide_right':
          newEl.style.transform = 'translateX(-100%)';
          newEl.style.opacity = '1';
          newEl.style.transition = `transform ${duration}ms ease`;
          requestAnimationFrame(() => {
            newEl.style.transform = 'translateX(0)';
          });
          break;

        default:
          newEl.style.opacity = '1';
          break;
      }

      setTimeout(resolve, duration);
    });
  }

  // --- Characters ---

  /**
   * Show a character on screen
   */
  async showCharacter(
    characterId: string,
    state: CharacterState,
    config: CharacterConfig,
    transition?: TransitionConfig
  ): Promise<void> {
    // Remove existing element if any
    this.hideCharacterElement(characterId);

    const expression = state.expression || 'normal';
    const spriteSrc = await this.resolveCharacterSprite(characterId, expression, config);

    const el = document.createElement('div');
    el.className = 'vn-character';
    el.dataset.characterId = characterId;

    const pos = this.resolvePosition(state.position);

    el.style.cssText = `
      position: absolute;
      bottom: 0;
      left: ${pos.x * 100}%;
      transform: translateX(-50%) ${state.flipped ? 'scaleX(-1)' : ''} scale(${state.scale});
      height: 90%;
      pointer-events: none;
      z-index: ${state.zIndex || 10};
      transition: left 0.5s ease, transform 0.5s ease, opacity 0.3s ease, filter 0.3s ease;
    `;

    const img = document.createElement('img');
    img.src = spriteSrc;
    img.style.cssText = `
      height: 100%;
      width: auto;
      object-fit: contain;
      pointer-events: none;
    `;
    img.alt = characterId;
    el.appendChild(img);

    // Apply entrance transition
    if (transition && transition.type !== 'none') {
      const duration = transition.duration || 500;
      switch (transition.type) {
        case 'fade':
          el.style.opacity = '0';
          this.characterLayer.appendChild(el);
          requestAnimationFrame(() => {
            el.style.transition = `opacity ${duration}ms ease, left 0.5s ease, transform 0.5s ease, filter 0.3s ease`;
            el.style.opacity = String(state.opacity);
          });
          break;
        case 'slide_left':
          el.style.opacity = String(state.opacity);
          el.style.left = '110%';
          this.characterLayer.appendChild(el);
          requestAnimationFrame(() => {
            el.style.left = `${pos.x * 100}%`;
          });
          break;
        case 'slide_right':
          el.style.opacity = String(state.opacity);
          el.style.left = '-10%';
          this.characterLayer.appendChild(el);
          requestAnimationFrame(() => {
            el.style.left = `${pos.x * 100}%`;
          });
          break;
        default:
          el.style.opacity = String(state.opacity);
          this.characterLayer.appendChild(el);
      }
    } else {
      el.style.opacity = String(state.opacity);
      this.characterLayer.appendChild(el);
    }

    this.characterElements.set(characterId, el);
  }

  /**
   * Hide a character from screen
   */
  async hideCharacter(characterId: string, transition?: TransitionConfig): Promise<void> {
    const el = this.characterElements.get(characterId);
    if (!el) return;

    if (transition && transition.type !== 'none') {
      const duration = transition.duration || 500;
      el.style.transition = `opacity ${duration}ms ease, left ${duration}ms ease`;

      switch (transition.type) {
        case 'fade':
          el.style.opacity = '0';
          break;
        case 'slide_left':
          el.style.left = '-20%';
          break;
        case 'slide_right':
          el.style.left = '120%';
          break;
        default:
          el.style.opacity = '0';
      }

      await new Promise((r) => setTimeout(r, duration));
    }

    this.hideCharacterElement(characterId);
  }

  private hideCharacterElement(characterId: string): void {
    const el = this.characterElements.get(characterId);
    if (el) {
      el.remove();
      this.characterElements.delete(characterId);
    }
  }

  /**
   * Update character expression
   */
  async updateCharacterExpression(
    characterId: string,
    expression: string,
    config: CharacterConfig
  ): Promise<void> {
    const el = this.characterElements.get(characterId);
    if (!el) return;

    const img = el.querySelector('img');
    if (!img) return;

    const spriteSrc = await this.resolveCharacterSprite(characterId, expression, config);

    // Cross-dissolve effect
    img.style.transition = 'opacity 0.15s ease';
    img.style.opacity = '0';
    await new Promise((r) => setTimeout(r, 150));
    img.src = spriteSrc;
    img.style.opacity = '1';
  }

  /**
   * Move a character to a new position
   */
  moveCharacter(characterId: string, position: CharacterPosition, duration = 500): void {
    const el = this.characterElements.get(characterId);
    if (!el) return;

    const pos = this.resolvePosition(position);
    el.style.transition = `left ${duration}ms ease`;
    el.style.left = `${pos.x * 100}%`;
  }

  /**
   * Highlight the active speaker, dim others
   */
  highlightCharacter(activeId: string | null): void {
    this.characterElements.forEach((el, id) => {
      if (activeId && id !== activeId) {
        el.style.filter = 'brightness(0.6)';
      } else {
        el.style.filter = 'brightness(1)';
      }
    });
  }

  // --- Screen Effects ---

  /**
   * Screen shake effect
   */
  async shakeScreen(intensity = 5, duration = 500): Promise<void> {
    const startTime = Date.now();
    const shake = () => {
      const elapsed = Date.now() - startTime;
      if (elapsed >= duration) {
        this.container.style.transform = '';
        return;
      }
      const progress = elapsed / duration;
      const decay = 1 - progress;
      const x = (Math.random() - 0.5) * intensity * 2 * decay;
      const y = (Math.random() - 0.5) * intensity * 2 * decay;
      this.container.style.transform = `translate(${x}px, ${y}px)`;
      requestAnimationFrame(shake);
    };
    shake();
    await new Promise((r) => setTimeout(r, duration));
  }

  /**
   * Screen flash effect
   */
  async flashScreen(color = '#ffffff', duration = 300): Promise<void> {
    const flash = document.createElement('div');
    flash.style.cssText = `
      position: absolute;
      top: 0; left: 0;
      width: 100%; height: 100%;
      background: ${color};
      z-index: 100;
      pointer-events: none;
      opacity: 1;
      transition: opacity ${duration}ms ease;
    `;
    this.fxLayer.appendChild(flash);
    requestAnimationFrame(() => {
      flash.style.opacity = '0';
    });
    await new Promise((r) => setTimeout(r, duration));
    flash.remove();
  }

  /**
   * Fade screen in or out
   */
  async fadeScreen(direction: 'in' | 'out', color = '#000000', duration = 1000): Promise<void> {
    const overlay = document.createElement('div');
    overlay.className = 'vn-fade-overlay';
    overlay.style.cssText = `
      position: absolute;
      top: 0; left: 0;
      width: 100%; height: 100%;
      background: ${color};
      z-index: 99;
      pointer-events: none;
      opacity: ${direction === 'out' ? '0' : '1'};
      transition: opacity ${duration}ms ease;
    `;
    this.fxLayer.appendChild(overlay);

    requestAnimationFrame(() => {
      overlay.style.opacity = direction === 'out' ? '1' : '0';
    });

    await new Promise((r) => setTimeout(r, duration));

    if (direction === 'in') {
      overlay.remove();
    }
    // For fade out, keep the overlay until fade in is called
  }

  /**
   * Remove all fade overlays
   */
  clearFadeOverlays(): void {
    this.fxLayer.querySelectorAll('.vn-fade-overlay').forEach((el) => el.remove());
  }

  // --- Weather Effects ---

  /**
   * Set weather effect
   */
  setWeather(effect: string, intensity = 0.5): void {
    this.clearWeather();

    if (effect === 'clear' || effect === 'none') return;

    this.weatherElement = document.createElement('div');
    this.weatherElement.className = `vn-weather vn-weather-${effect}`;
    this.weatherElement.style.cssText = `
      position: absolute;
      top: 0; left: 0;
      width: 100%; height: 100%;
      pointer-events: none;
      z-index: 5;
      opacity: ${intensity};
    `;

    // Create particle-based weather effects using CSS
    switch (effect) {
      case 'rain':
        this.createRainEffect(this.weatherElement, intensity);
        break;
      case 'snow':
        this.createSnowEffect(this.weatherElement, intensity);
        break;
      case 'sakura':
        this.createSakuraEffect(this.weatherElement, intensity);
        break;
      default:
        // Generic overlay
        this.weatherElement.style.background = this.getWeatherGradient(effect);
    }

    this.fxLayer.appendChild(this.weatherElement);
  }

  private createRainEffect(container: HTMLElement, intensity: number): void {
    const count = Math.floor(80 * intensity);
    for (let i = 0; i < count; i++) {
      const drop = document.createElement('div');
      drop.style.cssText = `
        position: absolute;
        left: ${Math.random() * 100}%;
        top: ${Math.random() * -100}%;
        width: 2px;
        height: ${15 + Math.random() * 20}px;
        background: linear-gradient(transparent, rgba(174, 194, 224, 0.6));
        animation: vn-rain ${0.4 + Math.random() * 0.3}s linear infinite;
        animation-delay: ${Math.random() * 2}s;
      `;
      container.appendChild(drop);
    }
  }

  private createSnowEffect(container: HTMLElement, intensity: number): void {
    const count = Math.floor(50 * intensity);
    for (let i = 0; i < count; i++) {
      const flake = document.createElement('div');
      const size = 3 + Math.random() * 6;
      flake.style.cssText = `
        position: absolute;
        left: ${Math.random() * 100}%;
        top: ${Math.random() * -50}%;
        width: ${size}px;
        height: ${size}px;
        background: white;
        border-radius: 50%;
        opacity: ${0.5 + Math.random() * 0.5};
        animation: vn-snow ${3 + Math.random() * 4}s linear infinite;
        animation-delay: ${Math.random() * 5}s;
      `;
      container.appendChild(flake);
    }
  }

  private createSakuraEffect(container: HTMLElement, intensity: number): void {
    const count = Math.floor(20 * intensity);
    for (let i = 0; i < count; i++) {
      const petal = document.createElement('div');
      const size = 8 + Math.random() * 8;
      petal.style.cssText = `
        position: absolute;
        left: ${Math.random() * 100}%;
        top: ${Math.random() * -50}%;
        width: ${size}px;
        height: ${size * 0.6}px;
        background: rgba(255, 183, 197, 0.8);
        border-radius: 50% 0 50% 0;
        animation: vn-sakura ${5 + Math.random() * 5}s linear infinite;
        animation-delay: ${Math.random() * 8}s;
      `;
      container.appendChild(petal);
    }
  }

  private getWeatherGradient(effect: string): string {
    switch (effect) {
      case 'fog':
        return 'linear-gradient(rgba(200,200,200,0.3), rgba(200,200,200,0.1))';
      default:
        return 'transparent';
    }
  }

  clearWeather(): void {
    if (this.weatherElement) {
      this.weatherElement.remove();
      this.weatherElement = null;
    }
  }

  // --- Cinematic Mode ---

  /**
   * Toggle cinematic letterbox bars
   */
  setCinematicMode(enabled: boolean): void {
    if (enabled && !this.cinematicBars) {
      const top = document.createElement('div');
      const bottom = document.createElement('div');
      const barStyle = `
        position: absolute;
        left: 0; width: 100%;
        height: 0;
        background: #000;
        z-index: 50;
        transition: height 0.8s ease;
        pointer-events: none;
      `;
      top.style.cssText = barStyle + 'top: 0;';
      bottom.style.cssText = barStyle + 'bottom: 0;';
      this.fxLayer.appendChild(top);
      this.fxLayer.appendChild(bottom);
      this.cinematicBars = { top, bottom };

      requestAnimationFrame(() => {
        top.style.height = '12%';
        bottom.style.height = '12%';
      });
    } else if (!enabled && this.cinematicBars) {
      this.cinematicBars.top.style.height = '0';
      this.cinematicBars.bottom.style.height = '0';
      const bars = this.cinematicBars;
      this.cinematicBars = null;
      setTimeout(() => {
        bars.top.remove();
        bars.bottom.remove();
      }, 800);
    }
  }

  // --- Utility ---

  private resolvePosition(position: CharacterPosition): { x: number; y: number } {
    if (typeof position === 'string') {
      return POSITION_MAP[position] || POSITION_MAP['center'];
    }
    return { x: position.x / this.width, y: position.y / this.height };
  }

  /**
   * Take a screenshot of the current scene (for save thumbnails)
   */
  async takeScreenshot(): Promise<string | undefined> {
    // Use html2canvas-like approach or canvas capture
    // For simplicity, return undefined - can be enhanced with html2canvas
    return undefined;
  }

  /**
   * Clear all rendered content
   */
  clear(): void {
    this.bgLayer.innerHTML = '';
    this.characterLayer.innerHTML = '';
    this.fxLayer.innerHTML = '';
    this.currentBgElement = null;
    this.characterElements.clear();
    this.weatherElement = null;
    this.cinematicBars = null;
  }

  /**
   * Destroy the render engine
   */
  destroy(): void {
    this.clear();
    this.container.innerHTML = '';
  }
}
