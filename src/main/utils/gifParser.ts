// GIF Frame Parser - Node.js compatible
// Reads GIF files from disk and extracts basic info
// Actual frame rendering happens in the renderer process

import * as fs from 'fs';
import * as path from 'path';

export interface GifFrameInfo {
  delay: number; // ms
  index: number;
}

export interface GifInfo {
  width: number;
  height: number;
  frameCount: number;
  frames: GifFrameInfo[];
  buffer: Buffer; // raw file buffer, sent to renderer for rendering
}

/**
 * Read a GIF file and extract basic metadata
 * Frame rendering is handled by the renderer process using Canvas
 */
export async function parseGif(filePath: string): Promise<GifInfo> {
  const buffer = fs.readFileSync(filePath);

  // Parse GIF header for dimensions
  const width = buffer[6] | (buffer[7] << 8);
  const height = buffer[8] | (buffer[9] << 8);

  // Count frames by scanning for Graphic Control Extension blocks (0x21F9)
  // and Image Descriptor blocks (0x2C)
  const frames: GifFrameInfo[] = [];
  let i = 13; // skip header + LSD
  let lastDelay = 100;

  // Skip Global Color Table if present
  if (buffer[10] & 0x80) {
    const gctSize = 3 * (1 << ((buffer[10] & 0x07) + 1));
    i += gctSize;
  }

  while (i < buffer.length) {
    if (buffer[i] === 0x21) {
      // Extension block
      const extLabel = buffer[i + 1];
      if (extLabel === 0xF9) {
        // Graphic Control Extension - contains frame delay
        const blockSize = buffer[i + 2]; // should be 4
        const delay = (buffer[i + 4] | (buffer[i + 5] << 8)) * 10; // convert to ms
        lastDelay = delay > 0 ? delay : 100;
        i += 2 + blockSize + 1; // skip block + terminator
      } else {
        // Skip other extension blocks
        i += 2;
        while (buffer[i] !== 0 && i < buffer.length) {
          i += buffer[i] + 1;
        }
        i++; // skip terminator
      }
    } else if (buffer[i] === 0x2C) {
      // Image Descriptor - this is a frame
      frames.push({
        delay: lastDelay,
        index: frames.length,
      });
      // Skip image descriptor (10 bytes)
      i += 10;
      // Skip Local Color Table if present
      if (buffer[9] & 0x80) {
        const lctSize = 3 * (1 << ((buffer[9] & 0x07) + 1));
        i += lctSize;
      }
      // Skip LZW minimum code size
      i++;
      // Skip sub-blocks
      while (buffer[i] !== 0 && i < buffer.length) {
        i += buffer[i] + 1;
      }
      i++; // skip terminator
    } else if (buffer[i] === 0x3B) {
      // GIF Trailer
      break;
    } else {
      i++;
    }
  }

  return {
    width,
    height,
    frameCount: frames.length,
    frames,
    buffer,
  };
}

/**
 * Load all PNG/JPG files from a directory as a frame sequence
 * Returns file paths for the renderer to load
 */
export function loadFrameSequenceFromDir(dirPath: string): string[] {
  if (!fs.existsSync(dirPath)) {
    return [];
  }

  const files = fs.readdirSync(dirPath)
    .filter(f => /\.(png|jpg|jpeg|gif)$/i.test(f))
    .sort((a, b) => {
      // Sort by numeric index (0.png, 1.png, 2.png...)
      const numA = parseInt(a) || 0;
      const numB = parseInt(b) || 0;
      return numA - numB;
    })
    .map(f => path.join(dirPath, f));

  return files;
}
