import { describe, it, expect } from 'vitest';
import { 
  getFileType, 
  getFileTypeColors, 
  getFileTypeAndColors, 
  fileTypeColors,
  type FileType 
} from './file-type-colors';

describe('File Type Colors Utility', () => {
  describe('getFileType', () => {
    it('should identify image files correctly', () => {
      expect(getFileType('image/jpeg', 'photo.jpg')).toBe('image');
      expect(getFileType('image/png', 'screenshot.png')).toBe('image');
      expect(getFileType('image/gif', 'animation.gif')).toBe('image');
      expect(getFileType('image/svg+xml', 'icon.svg')).toBe('image');
      expect(getFileType(undefined, 'photo.webp')).toBe('image');
      expect(getFileType(undefined, 'icon.ico')).toBe('image');
    });

    it('should identify video files correctly', () => {
      expect(getFileType('video/mp4', 'movie.mp4')).toBe('video');
      expect(getFileType('video/avi', 'clip.avi')).toBe('video');
      expect(getFileType('video/quicktime', 'video.mov')).toBe('video');
      expect(getFileType(undefined, 'stream.webm')).toBe('video');
      expect(getFileType(undefined, 'recording.mkv')).toBe('video');
    });

    it('should identify audio files correctly', () => {
      expect(getFileType('audio/mpeg', 'song.mp3')).toBe('audio');
      expect(getFileType('audio/wav', 'sound.wav')).toBe('audio');
      expect(getFileType('audio/flac', 'music.flac')).toBe('audio');
      expect(getFileType(undefined, 'podcast.aac')).toBe('audio');
      expect(getFileType(undefined, 'voice.ogg')).toBe('audio');
    });

    it('should identify document files correctly', () => {
      expect(getFileType('application/pdf', 'document.pdf')).toBe('document');
      expect(getFileType('application/msword', 'report.doc')).toBe('document');
      expect(getFileType('application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'letter.docx')).toBe('document');
      expect(getFileType(undefined, 'readme.rtf')).toBe('document');
      expect(getFileType(undefined, 'notes.odt')).toBe('document');
    });

    it('should identify archive files correctly', () => {
      expect(getFileType('application/zip', 'archive.zip')).toBe('archive');
      expect(getFileType('application/x-rar-compressed', 'backup.rar')).toBe('archive');
      expect(getFileType('application/x-7z-compressed', 'files.7z')).toBe('archive');
      expect(getFileType(undefined, 'source.tar')).toBe('archive');
      expect(getFileType(undefined, 'compressed.gz')).toBe('archive');
    });

    it('should identify code files correctly', () => {
      expect(getFileType(undefined, 'script.js')).toBe('code');
      expect(getFileType(undefined, 'component.tsx')).toBe('code');
      expect(getFileType(undefined, 'styles.css')).toBe('code');
      expect(getFileType(undefined, 'config.json')).toBe('code');
      expect(getFileType(undefined, 'app.py')).toBe('code');
      expect(getFileType(undefined, 'Main.java')).toBe('code');
      expect(getFileType(undefined, 'program.cpp')).toBe('code');
      expect(getFileType(undefined, 'script.sh')).toBe('code');
    });

    it('should identify spreadsheet files correctly', () => {
      expect(getFileType('application/vnd.ms-excel', 'data.xls')).toBe('spreadsheet');
      expect(getFileType('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'budget.xlsx')).toBe('spreadsheet');
      expect(getFileType('text/csv', 'export.csv')).toBe('spreadsheet');
      expect(getFileType(undefined, 'calc.ods')).toBe('spreadsheet');
      expect(getFileType(undefined, 'numbers.numbers')).toBe('spreadsheet');
    });

    it('should identify presentation files correctly', () => {
      expect(getFileType('application/vnd.ms-powerpoint', 'slides.ppt')).toBe('presentation');
      expect(getFileType('application/vnd.openxmlformats-officedocument.presentationml.presentation', 'deck.pptx')).toBe('presentation');
      expect(getFileType(undefined, 'presentation.odp')).toBe('presentation');
      expect(getFileType(undefined, 'keynote.key')).toBe('presentation');
    });

    it('should identify text files correctly', () => {
      expect(getFileType('text/plain', 'readme.txt')).toBe('text');
      expect(getFileType('text/markdown', 'docs.md')).toBe('text');
      expect(getFileType(undefined, 'changelog.markdown')).toBe('text');
      expect(getFileType(undefined, 'error.log')).toBe('text');
      expect(getFileType(undefined, 'settings.cfg')).toBe('text');
    });

    it('should return default for unknown file types', () => {
      expect(getFileType('application/unknown', 'mystery.xyz')).toBe('default');
      expect(getFileType(undefined, 'file.unknown')).toBe('default');
      expect(getFileType()).toBe('default');
    });
  });

  describe('getFileTypeColors', () => {
    it('should return correct color scheme for each file type', () => {
      const fileTypes: FileType[] = [
        'folder', 'image', 'document', 'video', 'audio', 'archive', 
        'code', 'text', 'spreadsheet', 'presentation', 'default'
      ];

      fileTypes.forEach(type => {
        const colors = getFileTypeColors(type);
        expect(colors).toHaveProperty('bg');
        expect(colors).toHaveProperty('icon');
        expect(colors).toHaveProperty('border');
        expect(colors).toHaveProperty('hover');
        
        // Verify gradient backgrounds
        expect(colors.bg).toMatch(/^bg-gradient-to-br from-\w+-\d+ to-\w+-\d+$/);
        expect(colors.icon).toBe('text-white');
        expect(colors.border).toMatch(/^border-\w+-\d+$/);
        expect(colors.hover).toMatch(/^hover:from-\w+-\d+ hover:to-\w+-\d+$/);
      });
    });

    it('should have distinct colors for different file types', () => {
      const folderColors = getFileTypeColors('folder');
      const imageColors = getFileTypeColors('image');
      const documentColors = getFileTypeColors('document');
      
      expect(folderColors.bg).not.toBe(imageColors.bg);
      expect(imageColors.bg).not.toBe(documentColors.bg);
      expect(folderColors.border).not.toBe(imageColors.border);
    });
  });

  describe('getFileTypeAndColors', () => {
    it('should return both type and colors for a file', () => {
      const result = getFileTypeAndColors('image/jpeg', 'photo.jpg');
      
      expect(result.type).toBe('image');
      expect(result.colors).toEqual(fileTypeColors.image);
      expect(result.colors.bg).toBe('bg-gradient-to-br from-pink-400 to-pink-500');
    });

    it('should handle files without MIME type', () => {
      const result = getFileTypeAndColors(undefined, 'script.js');
      
      expect(result.type).toBe('code');
      expect(result.colors).toEqual(fileTypeColors.code);
    });

    it('should handle files without filename', () => {
      const result = getFileTypeAndColors('video/mp4');
      
      expect(result.type).toBe('video');
      expect(result.colors).toEqual(fileTypeColors.video);
    });
  });

  describe('fileTypeColors object', () => {
    it('should have all required file type color schemes', () => {
      const expectedTypes: FileType[] = [
        'folder', 'image', 'document', 'video', 'audio', 'archive',
        'code', 'text', 'spreadsheet', 'presentation', 'default'
      ];

      expectedTypes.forEach(type => {
        expect(fileTypeColors).toHaveProperty(type);
        expect(fileTypeColors[type]).toHaveProperty('bg');
        expect(fileTypeColors[type]).toHaveProperty('icon');
        expect(fileTypeColors[type]).toHaveProperty('border');
        expect(fileTypeColors[type]).toHaveProperty('hover');
      });
    });

    it('should use modern gradient backgrounds', () => {
      // Test specific color schemes match the design requirements
      expect(fileTypeColors.folder.bg).toBe('bg-gradient-to-br from-sky-400 to-sky-500');
      expect(fileTypeColors.image.bg).toBe('bg-gradient-to-br from-pink-400 to-pink-500');
      expect(fileTypeColors.document.bg).toBe('bg-gradient-to-br from-indigo-400 to-indigo-500');
      expect(fileTypeColors.video.bg).toBe('bg-gradient-to-br from-violet-400 to-violet-500');
      expect(fileTypeColors.audio.bg).toBe('bg-gradient-to-br from-emerald-400 to-emerald-500');
      expect(fileTypeColors.archive.bg).toBe('bg-gradient-to-br from-orange-400 to-orange-500');
      expect(fileTypeColors.code.bg).toBe('bg-gradient-to-br from-purple-400 to-purple-500');
      expect(fileTypeColors.text.bg).toBe('bg-gradient-to-br from-blue-400 to-blue-500');
      expect(fileTypeColors.spreadsheet.bg).toBe('bg-gradient-to-br from-green-400 to-green-500');
      expect(fileTypeColors.presentation.bg).toBe('bg-gradient-to-br from-red-400 to-red-500');
      expect(fileTypeColors.default.bg).toBe('bg-gradient-to-br from-gray-400 to-gray-500');
    });

    it('should have consistent icon color (white) for all types', () => {
      Object.values(fileTypeColors).forEach(colorScheme => {
        expect(colorScheme.icon).toBe('text-white');
      });
    });

    it('should have matching border colors for each gradient', () => {
      expect(fileTypeColors.folder.border).toBe('border-sky-300');
      expect(fileTypeColors.image.border).toBe('border-pink-300');
      expect(fileTypeColors.document.border).toBe('border-indigo-300');
      expect(fileTypeColors.video.border).toBe('border-violet-300');
      expect(fileTypeColors.audio.border).toBe('border-emerald-300');
      expect(fileTypeColors.archive.border).toBe('border-orange-300');
      expect(fileTypeColors.code.border).toBe('border-purple-300');
      expect(fileTypeColors.text.border).toBe('border-blue-300');
      expect(fileTypeColors.spreadsheet.border).toBe('border-green-300');
      expect(fileTypeColors.presentation.border).toBe('border-red-300');
      expect(fileTypeColors.default.border).toBe('border-gray-300');
    });

    it('should have hover effects that darken the gradients', () => {
      expect(fileTypeColors.folder.hover).toBe('hover:from-sky-500 hover:to-sky-600');
      expect(fileTypeColors.image.hover).toBe('hover:from-pink-500 hover:to-pink-600');
      expect(fileTypeColors.document.hover).toBe('hover:from-indigo-500 hover:to-indigo-600');
      expect(fileTypeColors.video.hover).toBe('hover:from-violet-500 hover:to-violet-600');
      expect(fileTypeColors.audio.hover).toBe('hover:from-emerald-500 hover:to-emerald-600');
      expect(fileTypeColors.archive.hover).toBe('hover:from-orange-500 hover:to-orange-600');
      expect(fileTypeColors.code.hover).toBe('hover:from-purple-500 hover:to-purple-600');
      expect(fileTypeColors.text.hover).toBe('hover:from-blue-500 hover:to-blue-600');
      expect(fileTypeColors.spreadsheet.hover).toBe('hover:from-green-500 hover:to-green-600');
      expect(fileTypeColors.presentation.hover).toBe('hover:from-red-500 hover:to-red-600');
      expect(fileTypeColors.default.hover).toBe('hover:from-gray-500 hover:to-gray-600');
    });
  });
});