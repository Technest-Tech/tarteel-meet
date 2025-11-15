// Reaction sound utility for playing reaction-specific sounds

export type ReactionType = '👍' | '❤️' | '😂' | '😮' | '👏' | '🎉';

interface SoundMap {
  [key: string]: HTMLAudioElement | null;
}

class ReactionSoundManager {
  private sounds: SoundMap = {};
  private volume: number = 0.5; // Default volume (0-1)

  constructor() {
    // Preload all reaction sounds
    this.preloadSounds();
  }

  private preloadSounds() {
    const reactionSounds: { [key in ReactionType]: string } = {
      '👍': '/sounds/365scores_like.mp3',
      '❤️': '/sounds/my_love.mp3',
      '😂': '/sounds/laughs.mp3',
      '😮': '/sounds/wow.mp3',
      '👏': '/sounds/clap.mp3',
      '🎉': '/sounds/children_celebrating.mp3',
    };

    // Try to preload sounds, but handle errors gracefully
    Object.entries(reactionSounds).forEach(([reaction, path]) => {
      try {
        const audio = new Audio(path);
        audio.volume = this.volume;
        audio.preload = 'auto';
        // Handle load errors silently (sound file might not exist yet)
        audio.addEventListener('error', (e) => {
          // Silently fail - sound file doesn't exist
          this.sounds[reaction] = null;
        });
        audio.addEventListener('canplaythrough', () => {
          // Sound loaded successfully
        });
        this.sounds[reaction] = audio;
      } catch (error) {
        // Silently fail - sound file doesn't exist
        this.sounds[reaction] = null;
      }
    });
  }

  play(reaction: ReactionType) {
    const audio = this.sounds[reaction];
    if (audio) {
      try {
        // Check if audio is ready to play
        if (audio.readyState >= 2) { // HAVE_CURRENT_DATA or higher
          // Reset to start and play
          audio.currentTime = 0;
          audio.volume = this.volume;
          audio.play().then(() => {
            // Stop playback after 3 seconds
            setTimeout(() => {
              if (!audio.paused) {
                audio.pause();
                audio.currentTime = 0;
              }
            }, 3000);
          }).catch((error) => {
            // If file doesn't exist, play fallback beep
            this.playFallbackBeep(reaction);
          });
        } else {
          // Audio not ready, try fallback
          this.playFallbackBeep(reaction);
        }
      } catch (error) {
        // Play fallback beep if audio fails
        this.playFallbackBeep(reaction);
      }
    } else {
      // No audio file, play fallback beep
      this.playFallbackBeep(reaction);
    }
  }

  private playFallbackBeep(reaction: ReactionType) {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const masterGain = audioContext.createGain();
      masterGain.connect(audioContext.destination);
      masterGain.gain.value = this.volume * 0.4;

      const now = audioContext.currentTime;

      switch (reaction) {
        case '👍': // Thumbs Up - Positive confirmation sound
          this.playThumbsUpSound(audioContext, masterGain, now);
          break;
        case '❤️': // Heart - Warm, pleasant sound
          this.playHeartSound(audioContext, masterGain, now);
          break;
        case '😂': // Laughing - Bouncy, playful sound
          this.playLaughingSound(audioContext, masterGain, now);
          break;
        case '😮': // Surprised - Quick, sharp sound
          this.playSurprisedSound(audioContext, masterGain, now);
          break;
        case '👏': // Clapping - Rhythmic clapping pattern
          this.playClappingSound(audioContext, masterGain, now);
          break;
        case '🎉': // Celebration - Festive, ascending sound
          this.playCelebrationSound(audioContext, masterGain, now);
          break;
      }
    } catch (error) {
      // Silently fail if Web Audio API is not available
    }
  }

  private playThumbsUpSound(ctx: AudioContext, gain: GainNode, startTime: number) {
    // Natural "pop" sound using filtered noise with pitch
    const duration = 0.2;
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    
    // Create a more natural sound with frequency sweep and noise
    for (let i = 0; i < bufferSize; i++) {
      const t = i / ctx.sampleRate;
      const progress = t / duration;
      const freq = 200 + (400 - 200) * (1 - progress); // Sweep down
      const phase = 2 * Math.PI * freq * t;
      const noise = (Math.random() * 2 - 1) * 0.3;
      const envelope = Math.exp(-progress * 8); // Exponential decay
      data[i] = (Math.sin(phase) * 0.7 + noise) * envelope;
    }
    
    const source = ctx.createBufferSource();
    const sourceGain = ctx.createGain();
    source.buffer = buffer;
    source.connect(sourceGain);
    sourceGain.connect(gain);
    sourceGain.gain.value = 0.5;
    
    source.start(startTime);
    source.stop(startTime + duration);
  }

  private playHeartSound(ctx: AudioContext, gain: GainNode, startTime: number) {
    // Warm, soft "whoosh" sound
    const duration = 0.4;
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < bufferSize; i++) {
      const t = i / ctx.sampleRate;
      const progress = t / duration;
      const freq = 300 + Math.sin(progress * Math.PI * 4) * 50; // Gentle vibrato
      const phase = 2 * Math.PI * freq * t;
      const envelope = Math.sin(progress * Math.PI) * Math.exp(-progress * 3);
      data[i] = Math.sin(phase) * envelope * 0.6;
    }
    
    const source = ctx.createBufferSource();
    const sourceGain = ctx.createGain();
    source.buffer = buffer;
    source.connect(sourceGain);
    sourceGain.connect(gain);
    sourceGain.gain.value = 0.5;
    
    source.start(startTime);
    source.stop(startTime + duration);
  }

  private playLaughingSound(ctx: AudioContext, gain: GainNode, startTime: number) {
    // Bubbly, bouncy sound pattern
    const notes = [
      { freq: 500, time: 0, dur: 0.08 },
      { freq: 450, time: 0.1, dur: 0.08 },
      { freq: 400, time: 0.2, dur: 0.08 },
      { freq: 350, time: 0.3, dur: 0.1 },
    ];
    
    notes.forEach(note => {
      const bufferSize = ctx.sampleRate * note.dur;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      
      for (let i = 0; i < bufferSize; i++) {
        const t = i / ctx.sampleRate;
        const phase = 2 * Math.PI * note.freq * t;
        const envelope = Math.sin((t / note.dur) * Math.PI);
        const noise = (Math.random() * 2 - 1) * 0.2;
        data[i] = (Math.sin(phase) * 0.6 + noise) * envelope;
      }
      
      const source = ctx.createBufferSource();
      const sourceGain = ctx.createGain();
      source.buffer = buffer;
      source.connect(sourceGain);
      sourceGain.connect(gain);
      sourceGain.gain.value = 0.4;
      
      source.start(startTime + note.time);
      source.stop(startTime + note.time + note.dur);
    });
  }

  private playSurprisedSound(ctx: AudioContext, gain: GainNode, startTime: number) {
    // Sharp "whoop" sound
    const duration = 0.2;
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < bufferSize; i++) {
      const t = i / ctx.sampleRate;
      const progress = t / duration;
      const freq = 300 + (1500 - 300) * progress; // Rapid sweep up
      const phase = 2 * Math.PI * freq * t;
      const envelope = Math.exp(-progress * 5) * (1 - progress * 0.5);
      data[i] = Math.sin(phase) * envelope * 0.7;
    }
    
    const source = ctx.createBufferSource();
    const sourceGain = ctx.createGain();
    source.buffer = buffer;
    source.connect(sourceGain);
    sourceGain.connect(gain);
    sourceGain.gain.value = 0.6;
    
    source.start(startTime);
    source.stop(startTime + duration);
  }

  private playClappingSound(ctx: AudioContext, gain: GainNode, startTime: number) {
    // More realistic clapping using filtered noise bursts
    const clapTimes = [0, 0.08, 0.16, 0.28, 0.36, 0.44];
    
    clapTimes.forEach((offset, i) => {
      const duration = 0.06;
      const bufferSize = ctx.sampleRate * duration;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      
      // Create filtered noise that sounds like clapping
      for (let j = 0; j < bufferSize; j++) {
        const t = j / ctx.sampleRate;
        const progress = t / duration;
        const noise = (Math.random() * 2 - 1);
        // Filter: emphasize mid frequencies and add decay
        const filter = Math.sin(progress * Math.PI) * Math.exp(-progress * 10);
        // Add some pitch content
        const pitch = Math.sin(2 * Math.PI * 200 * t) * 0.3;
        data[j] = (noise * 0.7 + pitch) * filter;
      }
      
      const source = ctx.createBufferSource();
      const sourceGain = ctx.createGain();
      source.buffer = buffer;
      source.connect(sourceGain);
      sourceGain.connect(gain);
      sourceGain.gain.value = 0.4 * (1 - i * 0.08);
      
      source.start(startTime + offset);
      source.stop(startTime + offset + duration);
    });
  }

  private playCelebrationSound(ctx: AudioContext, gain: GainNode, startTime: number) {
    // Festive ascending sound with harmonics
    const duration = 0.5;
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < bufferSize; i++) {
      const t = i / ctx.sampleRate;
      const progress = t / duration;
      // Ascending frequency with harmonics
      const baseFreq = 400 + (800 - 400) * progress;
      const phase1 = 2 * Math.PI * baseFreq * t;
      const phase2 = 2 * Math.PI * baseFreq * 2 * t; // Octave
      const phase3 = 2 * Math.PI * baseFreq * 3 * t; // Fifth
      const envelope = Math.sin(progress * Math.PI) * Math.exp(-progress * 2);
      // Mix fundamental and harmonics
      data[i] = (Math.sin(phase1) * 0.5 + Math.sin(phase2) * 0.3 + Math.sin(phase3) * 0.2) * envelope;
    }
    
    const source = ctx.createBufferSource();
    const sourceGain = ctx.createGain();
    source.buffer = buffer;
    source.connect(sourceGain);
    sourceGain.connect(gain);
    sourceGain.gain.value = 0.5;
    
    source.start(startTime);
    source.stop(startTime + duration);
  }

  setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(1, volume));
    // Update volume for all loaded sounds
    Object.values(this.sounds).forEach((audio) => {
      if (audio) {
        audio.volume = this.volume;
      }
    });
  }

  getVolume(): number {
    return this.volume;
  }
}

// Export singleton instance
export const reactionSoundManager = new ReactionSoundManager();

