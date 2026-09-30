/**
 * Sound Effects System for Dopamine Hits
 * Plays satisfying audio feedback for achievements
 */

export class SoundEffects {
  private audioContext: AudioContext | null = null;
  private enabled: boolean = true;

  constructor() {
    if (typeof window !== 'undefined') {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  private playTone(frequency: number, duration: number, type: OscillatorType = 'sine') {
    if (!this.audioContext || !this.enabled) return;

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    oscillator.frequency.value = frequency;
    oscillator.type = type;

    gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);

    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + duration);
  }

  // Quest complete - ascending arpeggio
  questComplete() {
    if (!this.enabled) return;
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    notes.forEach((freq, i) => {
      setTimeout(() => this.playTone(freq, 0.2, 'triangle'), i * 100);
    });
  }

  // Level up - dramatic chord
  levelUp() {
    if (!this.enabled) return;
    const notes = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5
    notes.forEach((freq) => {
      this.playTone(freq, 0.4, 'sine');
    });
  }

  // Streak - fire-like rising tones
  streak() {
    if (!this.enabled) return;
    const notes = [400, 500, 600, 700, 800];
    notes.forEach((freq, i) => {
      setTimeout(() => this.playTone(freq, 0.15, 'sawtooth'), i * 80);
    });
  }

  // Combo - quick staccato
  combo() {
    if (!this.enabled) return;
    this.playTone(880, 0.1, 'square');
    setTimeout(() => this.playTone(1100, 0.1, 'square'), 50);
  }

  // Loot drop - magical chime
  lootDrop(rarity: 'common' | 'rare' | 'epic' | 'legendary') {
    if (!this.enabled) return;
    
    const baseFreq = rarity === 'legendary' ? 880 : 
                     rarity === 'epic' ? 659.25 :
                     rarity === 'rare' ? 523.25 : 440;
    
    this.playTone(baseFreq, 0.3, 'sine');
    setTimeout(() => this.playTone(baseFreq * 1.5, 0.3, 'sine'), 100);
    setTimeout(() => this.playTone(baseFreq * 2, 0.4, 'sine'), 200);
  }

  // Achievement - triumphant fanfare
  achievement() {
    if (!this.enabled) return;
    const notes = [392, 523.25, 659.25, 783.99, 1046.50];
    notes.forEach((freq, i) => {
      setTimeout(() => this.playTone(freq, 0.3, 'triangle'), i * 150);
    });
  }

  toggle(enabled: boolean) {
    this.enabled = enabled;
  }
}

// Singleton instance
export const soundEffects = new SoundEffects();
