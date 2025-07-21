// File type color mapping utility with gradient backgrounds
// Provides consistent color schemes for different file types

export interface FileTypeColorScheme {
  bg: string;
  icon: string;
  border: string;
  hover: string;
}

export interface FileTypeColors {
  folder: FileTypeColorScheme;
  image: FileTypeColorScheme;
  document: FileTypeColorScheme;
  video: FileTypeColorScheme;
  audio: FileTypeColorScheme;
  archive: FileTypeColorScheme;
  code: FileTypeColorScheme;
  text: FileTypeColorScheme;
  spreadsheet: FileTypeColorScheme;
  presentation: FileTypeColorScheme;
  default: FileTypeColorScheme;
}

export const fileTypeColors: FileTypeColors = {
  folder: {
    bg: 'bg-gradient-to-br from-sky-400 to-sky-500',
    icon: 'text-white',
    border: 'border-sky-300',
    hover: 'hover:from-sky-500 hover:to-sky-600'
  },
  image: {
    bg: 'bg-gradient-to-br from-pink-400 to-pink-500',
    icon: 'text-white',
    border: 'border-pink-300',
    hover: 'hover:from-pink-500 hover:to-pink-600'
  },
  document: {
    bg: 'bg-gradient-to-br from-indigo-400 to-indigo-500',
    icon: 'text-white',
    border: 'border-indigo-300',
    hover: 'hover:from-indigo-500 hover:to-indigo-600'
  },
  video: {
    bg: 'bg-gradient-to-br from-violet-400 to-violet-500',
    icon: 'text-white',
    border: 'border-violet-300',
    hover: 'hover:from-violet-500 hover:to-violet-600'
  },
  audio: {
    bg: 'bg-gradient-to-br from-emerald-400 to-emerald-500',
    icon: 'text-white',
    border: 'border-emerald-300',
    hover: 'hover:from-emerald-500 hover:to-emerald-600'
  },
  archive: {
    bg: 'bg-gradient-to-br from-orange-400 to-orange-500',
    icon: 'text-white',
    border: 'border-orange-300',
    hover: 'hover:from-orange-500 hover:to-orange-600'
  },
  code: {
    bg: 'bg-gradient-to-br from-purple-400 to-purple-500',
    icon: 'text-white',
    border: 'border-purple-300',
    hover: 'hover:from-purple-500 hover:to-purple-600'
  },
  text: {
    bg: 'bg-gradient-to-br from-blue-400 to-blue-500',
    icon: 'text-white',
    border: 'border-blue-300',
    hover: 'hover:from-blue-500 hover:to-blue-600'
  },
  spreadsheet: {
    bg: 'bg-gradient-to-br from-green-400 to-green-500',
    icon: 'text-white',
    border: 'border-green-300',
    hover: 'hover:from-green-500 hover:to-green-600'
  },
  presentation: {
    bg: 'bg-gradient-to-br from-red-400 to-red-500',
    icon: 'text-white',
    border: 'border-red-300',
    hover: 'hover:from-red-500 hover:to-red-600'
  },
  default: {
    bg: 'bg-gradient-to-br from-gray-400 to-gray-500',
    icon: 'text-white',
    border: 'border-gray-300',
    hover: 'hover:from-gray-500 hover:to-gray-600'
  }
};

export type FileType = keyof FileTypeColors;

/**
 * Determines the file type category based on MIME type or file extension
 */
export function getFileType(mimeType?: string, fileName?: string): FileType {
  if (!mimeType && !fileName) return 'default';
  
  const mime = mimeType?.toLowerCase() || '';
  const extension = fileName?.toLowerCase().split('.').pop() || '';
  
  // Image files
  if (mime.startsWith('image/') || 
      ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp', 'ico', 'tiff'].includes(extension)) {
    return 'image';
  }
  
  // Video files
  if (mime.startsWith('video/') || 
      ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv', 'm4v', '3gp'].includes(extension)) {
    return 'video';
  }
  
  // Audio files
  if (mime.startsWith('audio/') || 
      ['mp3', 'wav', 'flac', 'aac', 'ogg', 'wma', 'm4a', 'opus'].includes(extension)) {
    return 'audio';
  }
  
  // Archive files
  if (mime.includes('zip') || mime.includes('compressed') || mime.includes('archive') ||
      ['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz', 'dmg', 'iso'].includes(extension)) {
    return 'archive';
  }
  
  // Code files
  if (['js', 'ts', 'jsx', 'tsx', 'html', 'css', 'scss', 'sass', 'less', 'json', 'xml', 'yaml', 'yml',
       'py', 'java', 'cpp', 'c', 'h', 'cs', 'php', 'rb', 'go', 'rs', 'swift', 'kt', 'scala',
       'sh', 'bash', 'zsh', 'fish', 'ps1', 'bat', 'cmd', 'sql', 'r', 'matlab', 'm'].includes(extension)) {
    return 'code';
  }
  
  // Document files
  if (mime.includes('pdf') || mime.includes('document') || mime.includes('word') ||
      ['pdf', 'doc', 'docx', 'rtf', 'odt', 'pages'].includes(extension)) {
    return 'document';
  }
  
  // Spreadsheet files
  if (mime.includes('spreadsheet') || mime.includes('excel') ||
      ['xls', 'xlsx', 'csv', 'ods', 'numbers'].includes(extension)) {
    return 'spreadsheet';
  }
  
  // Presentation files
  if (mime.includes('presentation') || mime.includes('powerpoint') ||
      ['ppt', 'pptx', 'odp', 'key'].includes(extension)) {
    return 'presentation';
  }
  
  // Text files
  if (mime.startsWith('text/') || 
      ['txt', 'md', 'markdown', 'log', 'cfg', 'conf', 'ini', 'env'].includes(extension)) {
    return 'text';
  }
  
  return 'default';
}

/**
 * Gets the color scheme for a specific file type
 */
export function getFileTypeColors(fileType: FileType): FileTypeColorScheme {
  return fileTypeColors[fileType];
}

/**
 * Gets the file type and color scheme for a file
 */
export function getFileTypeAndColors(mimeType?: string, fileName?: string): {
  type: FileType;
  colors: FileTypeColorScheme;
} {
  const type = getFileType(mimeType, fileName);
  const colors = getFileTypeColors(type);
  
  return { type, colors };
}