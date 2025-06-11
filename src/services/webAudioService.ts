/**
 * Web Audio Service for PHat5
 * Provides audio processing capabilities for web deployment
 * Replaces Electron-specific audio processing with Web APIs
 */

import { Howl, Howler } from 'howler';

export interface AudioClip {
  id: string;
  name: string;
  duration: number;
  startTime: number;
  endTime: number;
  file: File | string;
  audioBuffer?: AudioBuffer;
  blob?: Blob;
}

export interface AudioMetadata {
  title?: string;
  artist?: string;
  album?: string;
  duration?: number;
  genre?: string;
  year?: number;
}

class WebAudioService {
  private audioContext: AudioContext | null = null;
  private currentHowl: Howl | null = null;

  constructor() {
    this.initializeAudioContext();
  }

  private initializeAudioContext() {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (error) {
      console.warn('Web Audio API not supported:', error);
    }
  }

  // Get audio context (create if needed)
  getAudioContext(): AudioContext | null {
    if (!this.audioContext) {
      this.initializeAudioContext();
    }
    return this.audioContext;
  }

  // Load audio file and extract metadata
  async loadAudioFile(file: File): Promise<{ metadata: AudioMetadata; audioBuffer: AudioBuffer }> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          const arrayBuffer = e.target?.result as ArrayBuffer;
          const audioContext = this.getAudioContext();
          
          if (!audioContext) {
            throw new Error('Audio context not available');
          }

          const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
          
          // Extract basic metadata
          const metadata: AudioMetadata = {
            title: file.name.replace(/\.[^/.]+$/, ''), // Remove extension
            duration: audioBuffer.duration,
          };

          resolve({ metadata, audioBuffer });
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsArrayBuffer(file);
    });
  }

  // Extract audio clip from file
  async extractClip(
    file: File,
    startTime: number,
    endTime: number,
    clipName: string
  ): Promise<AudioClip> {
    try {
      const { audioBuffer } = await this.loadAudioFile(file);
      const audioContext = this.getAudioContext();
      
      if (!audioContext) {
        throw new Error('Audio context not available');
      }

      const sampleRate = audioBuffer.sampleRate;
      const startSample = Math.floor(startTime * sampleRate);
      const endSample = Math.floor(endTime * sampleRate);
      const clipLength = endSample - startSample;

      // Create new buffer for the clip
      const clipBuffer = audioContext.createBuffer(
        audioBuffer.numberOfChannels,
        clipLength,
        sampleRate
      );

      // Copy audio data for each channel
      for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
        const sourceData = audioBuffer.getChannelData(channel);
        const clipData = clipBuffer.getChannelData(channel);
        
        for (let i = 0; i < clipLength; i++) {
          clipData[i] = sourceData[startSample + i] || 0;
        }
      }

      // Convert to blob for playback
      const blob = await this.audioBufferToBlob(clipBuffer);

      return {
        id: Date.now().toString(),
        name: clipName,
        duration: endTime - startTime,
        startTime,
        endTime,
        file: file.name,
        audioBuffer: clipBuffer,
        blob,
      };
    } catch (error) {
      console.error('Error extracting clip:', error);
      throw error;
    }
  }

  // Convert AudioBuffer to Blob
  private async audioBufferToBlob(audioBuffer: AudioBuffer): Promise<Blob> {
    const numberOfChannels = audioBuffer.numberOfChannels;
    const sampleRate = audioBuffer.sampleRate;
    const length = audioBuffer.length;

    // Create WAV file
    const buffer = new ArrayBuffer(44 + length * numberOfChannels * 2);
    const view = new DataView(buffer);

    // WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + length * numberOfChannels * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numberOfChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numberOfChannels * 2, true);
    view.setUint16(32, numberOfChannels * 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, length * numberOfChannels * 2, true);

    // Convert float samples to 16-bit PCM
    let offset = 44;
    for (let i = 0; i < length; i++) {
      for (let channel = 0; channel < numberOfChannels; channel++) {
        const sample = Math.max(-1, Math.min(1, audioBuffer.getChannelData(channel)[i]));
        view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
        offset += 2;
      }
    }

    return new Blob([buffer], { type: 'audio/wav' });
  }

  // Play audio clip
  playClip(clip: AudioClip): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        if (this.currentHowl) {
          this.currentHowl.stop();
        }

        const url = clip.blob ? URL.createObjectURL(clip.blob) : clip.file as string;
        
        this.currentHowl = new Howl({
          src: [url],
          format: ['wav', 'mp3', 'ogg'],
          onend: () => {
            if (clip.blob) {
              URL.revokeObjectURL(url);
            }
            resolve();
          },
          onloaderror: (id, error) => {
            console.error('Error loading audio:', error);
            reject(error);
          },
          onplayerror: (id, error) => {
            console.error('Error playing audio:', error);
            reject(error);
          }
        });

        this.currentHowl.play();
      } catch (error) {
        reject(error);
      }
    });
  }

  // Stop current playback
  stopPlayback() {
    if (this.currentHowl) {
      this.currentHowl.stop();
      this.currentHowl = null;
    }
  }

  // Get supported audio formats for web
  getSupportedFormats(): string[] {
    const audio = document.createElement('audio');
    const formats: string[] = [];

    const testFormats = [
      { ext: 'mp3', mime: 'audio/mpeg' },
      { ext: 'wav', mime: 'audio/wav' },
      { ext: 'ogg', mime: 'audio/ogg' },
      { ext: 'm4a', mime: 'audio/mp4' },
      { ext: 'aac', mime: 'audio/aac' },
    ];

    testFormats.forEach(format => {
      if (audio.canPlayType(format.mime)) {
        formats.push(format.ext);
      }
    });

    return formats;
  }

  // Cleanup resources
  cleanup() {
    this.stopPlayback();
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
    }
  }
}

export const webAudioService = new WebAudioService();
