// Self-contained Web Audio API synthesizer for retro/arcade sound effects in the style of Who Wants to Be a Millionaire.

class SoundEngine {
  private ctx: AudioContext | null = null;
  private backgroundDroneOscs: OscillatorNode[] = [];
  private backgroundDroneGain: GainNode | null = null;
  public enabled: boolean = false;

  private init() {
    if (this.ctx) return;
    try {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (e) {
      console.warn("Web Audio API is not supported in this browser.", e);
    }
  }

  public toggle(force?: boolean) {
    this.enabled = force !== undefined ? force : !this.enabled;
    if (!this.enabled) {
      this.stopDrone();
    } else {
      this.startDrone();
    }
    return this.enabled;
  }

  // Classic mystery drone
  public startDrone() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    if (this.ctx.state === "suspended") {
      this.ctx.resume();
    }

    if (this.backgroundDroneOscs.length > 0) {
      return; // Already running
    }

    try {
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc1.type = "sawtooth";
      osc1.frequency.setValueAtTime(55, this.ctx.currentTime); // Low A

      osc2.type = "sine";
      osc2.frequency.setValueAtTime(110, this.ctx.currentTime); // Low A octa

      // Filter to make it dark and mysterious
      const filter = this.ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(200, this.ctx.currentTime);

      gain.gain.setValueAtTime(0.001, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.12, this.ctx.currentTime + 2);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc1.start();
      osc2.start();

      this.backgroundDroneOscs = [osc1, osc2];
      this.backgroundDroneGain = gain;
    } catch (e) {
      console.error(e);
    }
  }

  public stopDrone() {
    if (this.backgroundDroneOscs.length > 0) {
      const oscsToStop = [...this.backgroundDroneOscs];
      const gainNode = this.backgroundDroneGain;
      const audioCtx = this.ctx;

      // Clear references immediately to prevent any race condition
      this.backgroundDroneOscs = [];
      this.backgroundDroneGain = null;

      try {
        if (gainNode && audioCtx) {
          gainNode.gain.setValueAtTime(gainNode.gain.value, audioCtx.currentTime);
          gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.3);
        }
      } catch (err) {
        console.warn("Error fading out drone gain", err);
      }

      setTimeout(() => {
        oscsToStop.forEach((osc) => {
          try {
            osc.stop();
            osc.disconnect();
          } catch (e) {
            // Already stopped or disconnected
          }
        });
      }, 350);
    }
  }

  // Click / Selection locked
  public playLockIn() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(220, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(330, this.ctx.currentTime + 1.2); // Intense rising pitch

    gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 1.25);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 1.3);
  }

  // Right answer chime
  public playCorrect() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    // Golden cascade (A Major chord arpeggios ascending)
    const notes = [220, 277.18, 329.63, 440, 554.37, 659.25, 880];
    const now = this.ctx.currentTime;

    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);

      gain.gain.setValueAtTime(0, now);
      gain.gain.setValueAtTime(0.12, now + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.6);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.7);
    });
  }

  // Wrong answer tone
  public playWrong() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    // Disappointed detuned saw wave drop
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = "sawtooth";
    osc1.frequency.setValueAtTime(146.83, now); // D3
    osc1.frequency.linearRampToValueAtTime(98.0, now + 1.0); // Drop to G2

    osc2.type = "sawtooth";
    osc2.frequency.setValueAtTime(144.0, now); // slightly detuned
    osc2.frequency.linearRampToValueAtTime(96.0, now + 1.0);

    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(500, now);
    filter.frequency.exponentialRampToValueAtTime(100, now + 0.9);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.linearRampToValueAtTime(0.001, now + 1.1);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 1.2);
    osc2.stop(now + 1.2);
  }

  // Lifeline trigger melody
  public playLifeline() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const notes = [587.33, 659.25, 783.99, 880, 987.77, 1174.66]; // D5, E5, G5, A5, B5, D6
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + idx * 0.06);

      gain.gain.setValueAtTime(0.1, now + idx * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.35);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now + idx * 0.06);
      osc.stop(now + idx * 0.06 + 0.4);
    });
  }

  // Ticking physical wood block
  public playTick() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(1200, this.ctx.currentTime);

    gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.05);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.06);
  }

  // Ultimate winning fanfares
  public playWin() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const chords = [
      [261.63, 329.63, 392.00, 523.25], // C chord
      [349.23, 440.00, 523.25, 698.46], // F chord
      [392.00, 493.88, 587.33, 783.99], // G chord
      [523.25, 659.25, 783.99, 1046.50] // High C chord
    ];

    chords.forEach((chord, chordIdx) => {
      chord.forEach((freq) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(freq, now + chordIdx * 0.4);

        const filter = this.ctx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.setValueAtTime(1000, now);

        gain.gain.setValueAtTime(0, now);
        gain.gain.setValueAtTime(0.06, now + chordIdx * 0.4);
        gain.gain.exponentialRampToValueAtTime(0.001, now + chordIdx * 0.4 + 0.38);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now + chordIdx * 0.4);
        osc.stop(now + chordIdx * 0.4 + 0.4);
      });
    });
  }
}

export const sound = new SoundEngine();
