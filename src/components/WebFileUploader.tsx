/**
 * Web File Uploader Component for PHat5
 * Handles file uploads and library management for web deployment
 */

import React, { useState, useCallback, useRef } from 'react';
import {
  Box,
  Button,
  Typography,
  LinearProgress,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Delete as DeleteIcon,
  PlayArrow as PlayIcon,
  Stop as StopIcon,
  MusicNote as MusicIcon,
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import { webAudioService, AudioMetadata } from '../services/webAudioService';
import { isWeb, hasFeature } from '../utils/platformDetection';

interface UploadedFile {
  id: string;
  file: File;
  metadata: AudioMetadata;
  status: 'uploading' | 'processing' | 'ready' | 'error';
  error?: string;
}

interface WebFileUploaderProps {
  onFilesProcessed: (files: UploadedFile[]) => void;
  maxFiles?: number;
  acceptedFormats?: string[];
}

const WebFileUploader: React.FC<WebFileUploaderProps> = ({
  onFilesProcessed,
  maxFiles = 100,
  acceptedFormats = ['mp3', 'wav', 'ogg', 'm4a', 'aac'],
}) => {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [showUnsupportedDialog, setShowUnsupportedDialog] = useState(false);
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check if File System Access API is available
  const hasFileSystemAccess = hasFeature('fileSystemAccess');

  const processFiles = useCallback(async (files: File[]) => {
    setIsProcessing(true);
    setProcessingProgress(0);
    
    const newFiles: UploadedFile[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileId = `${Date.now()}-${i}`;
      
      try {
        // Add file with uploading status
        const uploadedFile: UploadedFile = {
          id: fileId,
          file,
          metadata: { title: file.name },
          status: 'processing',
        };
        
        newFiles.push(uploadedFile);
        setUploadedFiles(prev => [...prev, uploadedFile]);
        
        // Process audio metadata
        const { metadata } = await webAudioService.loadAudioFile(file);
        
        // Update file with metadata
        const processedFile: UploadedFile = {
          ...uploadedFile,
          metadata,
          status: 'ready',
        };
        
        newFiles[i] = processedFile;
        setUploadedFiles(prev => 
          prev.map(f => f.id === fileId ? processedFile : f)
        );
        
      } catch (error) {
        console.error('Error processing file:', file.name, error);
        
        const errorFile: UploadedFile = {
          id: fileId,
          file,
          metadata: { title: file.name },
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
        };
        
        newFiles[i] = errorFile;
        setUploadedFiles(prev => 
          prev.map(f => f.id === fileId ? errorFile : f)
        );
      }
      
      setProcessingProgress(((i + 1) / files.length) * 100);
    }
    
    setIsProcessing(false);
    onFilesProcessed(newFiles.filter(f => f.status === 'ready'));
  }, [onFilesProcessed]);

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    if (rejectedFiles.length > 0) {
      setShowUnsupportedDialog(true);
    }
    
    if (acceptedFiles.length > 0) {
      processFiles(acceptedFiles);
    }
  }, [processFiles]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'audio/*': acceptedFormats.map(format => `.${format}`),
    },
    maxFiles,
    disabled: isProcessing,
  });

  const handleFileSelect = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length > 0) {
      processFiles(files);
    }
  };

  const handleDirectorySelect = async () => {
    if (!hasFileSystemAccess) {
      alert('Directory selection not supported in this browser');
      return;
    }

    try {
      // @ts-ignore - File System Access API
      const dirHandle = await window.showDirectoryPicker();
      const files: File[] = [];
      
      // Recursively get all audio files
      const processDirectory = async (dirHandle: any) => {
        for await (const entry of dirHandle.values()) {
          if (entry.kind === 'file') {
            const file = await entry.getFile();
            const extension = file.name.split('.').pop()?.toLowerCase();
            if (extension && acceptedFormats.includes(extension)) {
              files.push(file);
            }
          } else if (entry.kind === 'directory') {
            await processDirectory(entry);
          }
        }
      };
      
      await processDirectory(dirHandle);
      
      if (files.length > 0) {
        processFiles(files);
      } else {
        alert('No supported audio files found in the selected directory');
      }
    } catch (error) {
      console.error('Error selecting directory:', error);
    }
  };

  const handlePlayFile = async (uploadedFile: UploadedFile) => {
    if (currentlyPlaying === uploadedFile.id) {
      webAudioService.stopPlayback();
      setCurrentlyPlaying(null);
      return;
    }

    try {
      setCurrentlyPlaying(uploadedFile.id);
      
      // Create a temporary clip for the entire file
      const { metadata } = await webAudioService.loadAudioFile(uploadedFile.file);
      const clip = await webAudioService.extractClip(
        uploadedFile.file,
        0,
        Math.min(metadata.duration || 30, 30), // Play first 30 seconds
        uploadedFile.metadata.title || 'Preview'
      );
      
      await webAudioService.playClip(clip);
      setCurrentlyPlaying(null);
    } catch (error) {
      console.error('Error playing file:', error);
      setCurrentlyPlaying(null);
    }
  };

  const handleDeleteFile = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return 'Unknown';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isWeb()) {
    return null; // Don't render in Electron
  }

  return (
    <Box>
      {/* Upload Area */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Box
            {...getRootProps()}
            sx={{
              border: '2px dashed',
              borderColor: isDragActive ? 'primary.main' : 'grey.300',
              borderRadius: 2,
              p: 4,
              textAlign: 'center',
              cursor: 'pointer',
              bgcolor: isDragActive ? 'action.hover' : 'transparent',
              transition: 'all 0.2s ease',
            }}
          >
            <input {...getInputProps()} />
            <UploadIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              {isDragActive ? 'Drop files here' : 'Upload Audio Files'}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Drag & drop audio files here, or click to select files
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', flexWrap: 'wrap' }}>
              {acceptedFormats.map(format => (
                <Chip key={format} label={format.toUpperCase()} size="small" />
              ))}
            </Box>
          </Box>
          
          <Box sx={{ display: 'flex', gap: 2, mt: 2, justifyContent: 'center' }}>
            <Button
              variant="outlined"
              startIcon={<UploadIcon />}
              onClick={handleFileSelect}
              disabled={isProcessing}
            >
              Select Files
            </Button>
            
            {hasFileSystemAccess && (
              <Button
                variant="outlined"
                startIcon={<MusicIcon />}
                onClick={handleDirectorySelect}
                disabled={isProcessing}
              >
                Select Folder
              </Button>
            )}
          </Box>
          
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={acceptedFormats.map(f => `.${f}`).join(',')}
            style={{ display: 'none' }}
            onChange={handleFileInputChange}
          />
        </CardContent>
      </Card>

      {/* Processing Progress */}
      {isProcessing && (
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Processing Files...
            </Typography>
            <LinearProgress variant="determinate" value={processingProgress} />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {Math.round(processingProgress)}% complete
            </Typography>
          </CardContent>
        </Card>
      )}

      {/* Uploaded Files List */}
      {uploadedFiles.length > 0 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Uploaded Files ({uploadedFiles.length})
            </Typography>
            <List>
              {uploadedFiles.map((uploadedFile) => (
                <ListItem key={uploadedFile.id}>
                  <ListItemText
                    primary={uploadedFile.metadata.title || uploadedFile.file.name}
                    secondary={
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          {uploadedFile.metadata.artist && `${uploadedFile.metadata.artist} • `}
                          {formatDuration(uploadedFile.metadata.duration)} • 
                          {(uploadedFile.file.size / 1024 / 1024).toFixed(1)} MB
                        </Typography>
                        {uploadedFile.status === 'error' && (
                          <Typography variant="body2" color="error">
                            Error: {uploadedFile.error}
                          </Typography>
                        )}
                      </Box>
                    }
                  />
                  <ListItemSecondaryAction>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      {uploadedFile.status === 'ready' && (
                        <IconButton
                          onClick={() => handlePlayFile(uploadedFile)}
                          color={currentlyPlaying === uploadedFile.id ? 'secondary' : 'default'}
                        >
                          {currentlyPlaying === uploadedFile.id ? <StopIcon /> : <PlayIcon />}
                        </IconButton>
                      )}
                      <IconButton
                        onClick={() => handleDeleteFile(uploadedFile.id)}
                        color="error"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          </CardContent>
        </Card>
      )}

      {/* Unsupported Files Dialog */}
      <Dialog
        open={showUnsupportedDialog}
        onClose={() => setShowUnsupportedDialog(false)}
      >
        <DialogTitle>Unsupported Files</DialogTitle>
        <DialogContent>
          <Alert severity="warning">
            Some files were not uploaded because they are not supported audio formats.
            Supported formats: {acceptedFormats.join(', ').toUpperCase()}
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowUnsupportedDialog(false)}>OK</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default WebFileUploader;
