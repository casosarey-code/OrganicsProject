import { useState, useRef } from 'react';
import './FileUpload.css';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  accept?: string;
  label?: string;
  currentFile?: string;
}

export default function FileUpload({ onFileSelect, accept = "*/*", label, currentFile }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) handleFile(files[0]);
  };

  const handleFile = (file: File) => {
    setFileName(file.name);
    onFileSelect(file);
  };

  const handleClick = () => fileInputRef.current?.click();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) handleFile(files[0]);
  };

  const getFileDisplayName = () => {
    if (fileName) return fileName;
    if (currentFile) {
      const parts = currentFile.split('/');
      return parts[parts.length - 1];
    }
    return null;
  };

  return (
    <div 
      className={`file-upload-container ${isDragging ? 'dragging' : ''} ${getFileDisplayName() ? 'has-file' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
    >
      <input ref={fileInputRef} type="file" accept={accept} onChange={handleChange} style={{ display: 'none' }} />
      
      {getFileDisplayName() ? (
        <div className="file-upload-content">
          <span className="file-icon-success">✓</span>
          <span className="file-name">{getFileDisplayName()}</span>
        </div>
      ) : (
        <div className="file-upload-content">
          <span className="upload-icon">📎</span>
          <span className="upload-label">{label || 'Subir archivo'}</span>
        </div>
      )}
    </div>
  );
}
