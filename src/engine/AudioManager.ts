import { Howl, Howler } from 'howler';
import { EventBus } from './EventBus';
import type { GameSettings } from './types';

interface AudioTrack {
  howl: Howl;
  id?: number;
  key: string;
}

/**
 * AudioManager - Manages all audio playback including BGM, BGS, SFX, Voice, and System sounds.
 * Uses Howler.js for cross-browser audio support.
 */
export class AudioManager {
  private bgm: AudioTrack | null = null;
  private bgs: Map<string, AudioTrack> = new Map();
  private voice: AudioTrack | null = null;
  private basePath = './assets/';

  private bgmVolume = 0.8;
  private sfxVolume = 0.8;
  private voiceVolume = 0.8;
  private bgsVolume = 0.6;
  private masterVolume = 1.0;

  constructor(private eventBus: EventBus) {
    // Listen for settings changes
    this.eventBus.on('settings:change', (settings: unknown) => {
      const s = settings as GameSettings;
      this.bgmVolume = s.bgmVolume;
      this.sfxVolume = s.sfxVolume;
      this.voiceVolume = s.voiceVolume;
      this.bgsVolume = s.bgsVolume;
      this.masterVolume = s.masterVolume;
      this.updateVolumes();
    });
  }

  setBasePath(path: string): void {
    this.basePath = path.endsWith('/') ? path : path + '/';
  }

  /**
   * Apply current volume settings to all active audio
   */
  private updateVolumes(): void {
    Howler.volume(this.masterVolume);
    if (this.bgm) {
      this.bgm.howl.volume(this.bgmVolume);
    }
    this.bgs.forEach((track) => {
      track.howl.volume(this.bgsVolume);
    });
    if (this.voice) {
      this.voice.howl.volume(this.voiceVolume);
    }
  }

  /**
   * Apply volume settings from GameSettings
   */
  applySettings(settings: GameSettings): void {
    this.bgmVolume = settings.bgmVolume;
    this.sfxVolume = settings.sfxVolume;
    this.voiceVolume = settings.voiceVolume;
    this.bgsVolume = settings.bgsVolume;
    this.masterVolume = settings.masterVolume;
    this.updateVolumes();
  }

  // --- BGM ---

  /**
   * Play background music with optional crossfade
   */
  playBGM(src: string, options?: { volume?: number; fadeIn?: number; loop?: boolean }): void {
    const fullSrc = this.resolveAudioPath('bgm', src);
    const volume = options?.volume ?? this.bgmVolume;
    const fadeIn = options?.fadeIn ?? 1000;
    const loop = options?.loop ?? true;

    // If same track is already playing, skip
    if (this.bgm && this.bgm.key === src) return;

    // Fade out current BGM
    if (this.bgm) {
      const oldBgm = this.bgm;
      oldBgm.howl.fade(oldBgm.howl.volume(), 0, fadeIn);
      setTimeout(() => {
        oldBgm.howl.stop();
        oldBgm.howl.unload();
      }, fadeIn);
    }

    const howl = new Howl({
      src: [fullSrc],
      volume: 0,
      loop,
      html5: true,
    });

    howl.play();
    howl.fade(0, volume, fadeIn);

    this.bgm = { howl, key: src };
  }

  /**
   * Stop background music
   */
  stopBGM(fadeOut = 1000): void {
    if (!this.bgm) return;
    const bgm = this.bgm;
    this.bgm = null;
    bgm.howl.fade(bgm.howl.volume(), 0, fadeOut);
    setTimeout(() => {
      bgm.howl.stop();
      bgm.howl.unload();
    }, fadeOut);
  }

  /**
   * Pause/resume BGM
   */
  pauseBGM(): void {
    this.bgm?.howl.pause();
  }

  resumeBGM(): void {
    this.bgm?.howl.play();
  }

  // --- BGS (Background Sound / Ambience) ---

  /**
   * Play a background sound layer (can stack multiple)
   */
  playBGS(src: string, options?: { volume?: number; fadeIn?: number; loop?: boolean }): void {
    const fullSrc = this.resolveAudioPath('bgs', src);
    const volume = options?.volume ?? this.bgsVolume;
    const fadeIn = options?.fadeIn ?? 500;
    const loop = options?.loop ?? true;

    // Stop existing BGS with same key
    this.stopBGS(src);

    const howl = new Howl({
      src: [fullSrc],
      volume: 0,
      loop,
      html5: true,
    });

    howl.play();
    howl.fade(0, volume, fadeIn);

    this.bgs.set(src, { howl, key: src });
  }

  /**
   * Stop a specific background sound or all
   */
  stopBGS(key?: string, fadeOut = 500): void {
    if (key) {
      const track = this.bgs.get(key);
      if (track) {
        track.howl.fade(track.howl.volume(), 0, fadeOut);
        setTimeout(() => {
          track.howl.stop();
          track.howl.unload();
        }, fadeOut);
        this.bgs.delete(key);
      }
    } else {
      this.bgs.forEach((track) => {
        track.howl.fade(track.howl.volume(), 0, fadeOut);
        setTimeout(() => {
          track.howl.stop();
          track.howl.unload();
        }, fadeOut);
      });
      this.bgs.clear();
    }
  }

  // --- SFX ---

  /**
   * Play a one-shot sound effect
   */
  playSFX(src: string, volume?: number): void {
    const fullSrc = this.resolveAudioPath('sfx', src);
    const howl = new Howl({
      src: [fullSrc],
      volume: volume ?? this.sfxVolume,
    });
    howl.play();
    // Auto-cleanup after playback
    howl.on('end', () => howl.unload());
  }

  // --- Voice ---

  /**
   * Play a voice line (stops any currently playing voice)
   */
  playVoice(src: string, volume?: number): Promise<void> {
    return new Promise((resolve) => {
      // Stop current voice
      this.stopVoice();

      const fullSrc = this.resolveAudioPath('voice', src);
      const howl = new Howl({
        src: [fullSrc],
        volume: volume ?? this.voiceVolume,
      });

      howl.play();
      this.voice = { howl, key: src };

      howl.on('end', () => {
        if (this.voice?.key === src) {
          this.voice = null;
        }
        howl.unload();
        resolve();
      });
    });
  }

  /**
   * Stop current voice playback
   */
  stopVoice(): void {
    if (this.voice) {
      this.voice.howl.stop();
      this.voice.howl.unload();
      this.voice = null;
    }
  }

  /**
   * Check if voice is currently playing
   */
  isVoicePlaying(): boolean {
    return this.voice?.howl.playing() ?? false;
  }

  // --- System Sound ---

  /**
   * Play a UI/system sound (not affected by voice settings)
   */
  playSystem(src: string): void {
    const fullSrc = this.resolveAudioPath('sfx', src);
    const howl = new Howl({
      src: [fullSrc],
      volume: this.sfxVolume,
    });
    howl.play();
    howl.on('end', () => howl.unload());
  }

  // --- Stop All ---

  /**
   * Stop all audio on a specific channel or all channels
   */
  stopChannel(channel: 'bgm' | 'bgs' | 'sfx' | 'voice' | 'all', fadeOut = 500): void {
    switch (channel) {
      case 'bgm':
        this.stopBGM(fadeOut);
        break;
      case 'bgs':
        this.stopBGS(undefined, fadeOut);
        break;
      case 'voice':
        this.stopVoice();
        break;
      case 'all':
        this.stopBGM(fadeOut);
        this.stopBGS(undefined, fadeOut);
        this.stopVoice();
        break;
      // SFX are fire-and-forget, can't easily stop them
    }
  }

  /**
   * Stop everything and clean up
   */
  destroy(): void {
    this.stopChannel('all', 0);
    Howler.unload();
  }

  // --- Helpers ---

  private resolveAudioPath(category: string, src: string): string {
    if (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('data:')) {
      return src;
    }
    // Add extension if missing
    if (!src.match(/\.\w+$/)) {
      src += '.mp3';
    }
    const categoryPaths: Record<string, string> = {
      bgm: 'audio/bgm/',
      bgs: 'audio/bgs/',
      sfx: 'audio/sfx/',
      voice: 'audio/voice/',
    };
    return this.basePath + (categoryPaths[category] || '') + src;
  }

  /**
   * Get current BGM key
   */
  getCurrentBGM(): string | null {
    return this.bgm?.key ?? null;
  }
}
