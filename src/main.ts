import './style.css'
import { io } from 'socket.io-client';

// ===================================================================
//  IMPORTANT: THIS IS WHERE YOU PUT YOUR PUBLIC IP ADDRESS
// ===================================================================
// Replace 'YOUR_PUBLIC_IP_ADDRESS' with the public IP of the computer
// running the server.ts file. Make sure port 3000 is forwarded.
//
// Example: const SERVER_URL = 'http://123.45.67.89:3000';
//
const SERVER_URL = 'http://YOUR_PUBLIC_IP_ADDRESS:3000';

const app = document.querySelector<HTMLDivElement>('#app')!;

app.innerHTML = `
  <div class="container">
    <header>
      <h1>File Sync Monitor</h1>
      <div class="status">
        <span>Status:</span>
        <span id="connection-status" class="disconnected"></span>
      </div>
    </header>
    <main>
      <div class="upload-section">
        <h2>Add Files to Sync</h2>
        <p class="upload-hint">Select one or more files to automatically add them to the sync folder.</p>
        <form id="upload-form">
          <label for="file-input" class="file-input-label">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
            <span>Choose file(s)...</span>
          </label>
          <input type="file" id="file-input" name="files" style="display: none;" multiple />
        </form>
        <div id="upload-progress-container"></div>
      </div>
      <div class="file-explorer">
        <h2>Synced Files</h2>
        <div id="file-grid"></div>
      </div>
    </main>
  </div>
  
  <!-- Image Preview Modal -->
  <div id="preview-modal" class="modal-overlay" style="display: none;">
    <span class="close-modal">&times;</span>
    <img class="modal-content" id="preview-image">
  </div>

  <!-- Delete Confirmation Modal -->
  <div id="delete-confirm-modal" class="modal-overlay" style="display: none;">
    <div class="modal-dialog">
      <h3>Confirm Deletion</h3>
      <p id="delete-confirm-text"></p>
      <div class="modal-actions">
        <button id="delete-cancel-btn" class="action-btn">Cancel</button>
        <button id="delete-confirm-btn" class="action-btn delete-btn">Delete</button>
      </div>
    </div>
  </div>
`;

const socket = io(SERVER_URL);
const statusElement = document.getElementById('connection-status')!;
const uploadForm = document.getElementById('upload-form') as HTMLFormElement;
const fileInput = document.getElementById('file-input') as HTMLInputElement;
const fileGridElement = document.getElementById('file-grid')!;
const uploadProgressContainer = document.getElementById('upload-progress-container')!;

// Preview Modal Elements
const previewModal = document.getElementById('preview-modal')!;
const previewImage = document.getElementById('preview-image') as HTMLImageElement;
const closePreviewButton = document.querySelector('#preview-modal .close-modal')!;

// Delete Modal Elements
const deleteConfirmModal = document.getElementById('delete-confirm-modal')!;
const deleteConfirmText = document.getElementById('delete-confirm-text')!;
const deleteConfirmBtn = document.getElementById('delete-confirm-btn')!;
const deleteCancelBtn = document.getElementById('delete-cancel-btn')!;

const isImage = (filename: string): boolean => {
  const extension = filename.split('.').pop()?.toLowerCase() || '';
  return ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(extension);
};

const getFileIcon = (filename: string): string => {
  const extension = filename.split('.').pop()?.toLowerCase() || '';
  if (['doc', 'docx', 'pdf', 'txt', 'md'].includes(extension)) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>`;
  }
  if (['exe', 'msi', 'app', 'sh', 'bat'].includes(extension)) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 17 10 11 4 5"></polyline><line x1="12" y1="19" x2="20" y2="19"></line></svg>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>`;
};

const renderFileRepresentation = (filename: string): string => {
  const encodedFilename = encodeURIComponent(filename);
  if (isImage(filename)) {
    // Use the full server URL for image previews
    return `<img src="${SERVER_URL}/download/${encodedFilename}" alt="${filename}" loading="lazy">`;
  }
  return getFileIcon(filename);
};

// --- Preview Modal Logic ---
const showPreview = (filename: string) => {
  previewImage.src = `${SERVER_URL}/download/${encodeURIComponent(filename)}`;
  previewModal.style.display = 'flex';
};

const hidePreview = () => {
  previewModal.style.display = 'none';
  previewImage.src = '';
};

closePreviewButton.addEventListener('click', hidePreview);
previewModal.addEventListener('click', (e) => {
  if (e.target === previewModal) hidePreview();
});

// --- Delete Confirmation Logic ---
let fileToDelete: string | null = null;

const showDeleteConfirmation = (filename: string) => {
  fileToDelete = filename;
  deleteConfirmText.textContent = `Are you sure you want to delete "${filename}"? This action cannot be undone.`;
  deleteConfirmModal.style.display = 'flex';
};

const hideDeleteConfirmation = () => {
  fileToDelete = null;
  deleteConfirmModal.style.display = 'none';
};

deleteCancelBtn.addEventListener('click', hideDeleteConfirmation);
deleteConfirmModal.addEventListener('click', (e) => {
  if (e.target === deleteConfirmModal) hideDeleteConfirmation();
});

deleteConfirmBtn.addEventListener('click', async () => {
  if (!fileToDelete) return;

  try {
    const response = await fetch(`${SERVER_URL}/files/${encodeURIComponent(fileToDelete)}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || 'Failed to delete file');
    }
  } catch (error) {
    console.error(error);
    alert(`Error deleting file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  } finally {
    hideDeleteConfirmation();
  }
});

// --- Main Application Logic ---
const fetchAndRenderFiles = async () => {
  try {
    const response = await fetch(`${SERVER_URL}/files`);
    if (!response.ok) throw new Error('Failed to fetch files');
    
    const files: string[] = await response.json();
    fileGridElement.innerHTML = '';

    if (files.length === 0) {
      fileGridElement.innerHTML = '<p class="empty-message">No files in sync folder.</p>';
    } else {
      files.forEach(file => {
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';
        const encodedFile = encodeURIComponent(file);

        fileItem.innerHTML = `
          <div class="file-icon ${isImage(file) ? 'preview-trigger' : ''}" data-filename="${file}">
            ${renderFileRepresentation(file)}
          </div>
          <div class="file-name" title="${file}">${file}</div>
          <div class="file-actions">
            <a href="${SERVER_URL}/download/${encodedFile}" class="action-btn download-btn" download>Download</a>
            <button class="action-btn delete-btn" data-filename="${file}">Delete</button>
          </div>
        `;
        fileGridElement.appendChild(fileItem);
      });

      document.querySelectorAll('.delete-btn').forEach(button => {
        button.addEventListener('click', (e) => {
          const filename = (e.currentTarget as HTMLElement).dataset.filename;
          if (filename) showDeleteConfirmation(filename);
        });
      });

      document.querySelectorAll('.preview-trigger').forEach(icon => {
        icon.addEventListener('click', (e) => {
          const filename = (e.currentTarget as HTMLElement).dataset.filename;
          if (filename) showPreview(filename);
        });
      });
    }
  } catch (error) {
    console.error(error);
    fileGridElement.innerHTML = '<p class="empty-message">Error loading files.</p>';
  }
};

const uploadFileWithProgress = (file: File, onComplete: () => void) => {
  const progressItem = document.createElement('div');
  progressItem.className = 'upload-progress-item';
  progressItem.innerHTML = `
    <span class="filename">${file.name}</span>
    <div class="progress-bar-container">
      <div class="progress-bar"></div>
    </div>
    <span class="percentage">0%</span>
  `;
  uploadProgressContainer.appendChild(progressItem);

  const progressBar = progressItem.querySelector('.progress-bar') as HTMLDivElement;
  const percentageText = progressItem.querySelector('.percentage') as HTMLSpanElement;

  const formData = new FormData();
  formData.append('files', file);

  const xhr = new XMLHttpRequest();

  xhr.upload.addEventListener('progress', (event) => {
    if (event.lengthComputable) {
      const percentComplete = Math.round((event.loaded / event.total) * 100);
      progressBar.style.width = `${percentComplete}%`;
      percentageText.textContent = `${percentComplete}%`;
    }
  });

  xhr.addEventListener('load', () => {
    if (xhr.status >= 200 && xhr.status < 300) {
      percentageText.textContent = 'Done!';
      progressItem.classList.add('success');
    } else {
      percentageText.textContent = 'Error!';
      progressItem.classList.add('error');
      console.error(`Upload failed for ${file.name}: ${xhr.statusText}`);
    }
    setTimeout(() => progressItem.remove(), 5000);
    onComplete();
  });

  xhr.addEventListener('error', () => {
    percentageText.textContent = 'Error!';
    progressItem.classList.add('error');
    console.error(`Network error during upload for ${file.name}`);
    setTimeout(() => progressItem.remove(), 5000);
    onComplete();
  });

  xhr.open('POST', `${SERVER_URL}/upload`, true);
  xhr.send(formData);
};

const handleFileSelection = async () => {
  const files = fileInput.files;
  if (!files || files.length === 0) return;

  uploadProgressContainer.innerHTML = '';

  let completedUploads = 0;
  const totalFiles = files.length;

  const onUploadComplete = () => {
    completedUploads++;
    if (completedUploads === totalFiles) {
      uploadForm.reset();
    }
  };

  for (let i = 0; i < files.length; i++) {
    uploadFileWithProgress(files[i], onUploadComplete);
  }
};

fileInput.addEventListener('change', handleFileSelection);

socket.on('connect', () => {
  statusElement.textContent = 'Connected';
  statusElement.className = 'connected';
  fetchAndRenderFiles();
});

socket.on('disconnect', () => {
  statusElement.textContent = 'Disconnected';
  statusElement.className = 'disconnected';
});

socket.on('file-change', () => {
  fetchAndRenderFiles();
});
