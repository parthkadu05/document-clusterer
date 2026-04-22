document.addEventListener('DOMContentLoaded', () => {
    const dropzone = document.getElementById('dropzone');
    if (!dropzone) return; // Only run on dashboard

    const fileInput = document.getElementById('file-input');
    const fileListDom = document.getElementById('file-list');
    const submitBtn = document.getElementById('submit-btn');
    const searchInput = document.getElementById('search_name');
    const uploadForm = document.getElementById('upload-form');
    
    // Results DOM
    const resultsSection = document.getElementById('results-section');
    const resultMessage = document.getElementById('result-message');
    const downloadLink = document.getElementById('download-link');
    const previewBtn = document.getElementById('preview-btn');
    const resetBtn = document.getElementById('reset-btn');
    const previewModal = document.getElementById('preview-modal');
    const closeModal = document.getElementById('close-modal');
    const pdfFrame = document.getElementById('pdf-preview-frame');

    let uploadedFiles = new DataTransfer();

    // Trigger file input on dropzone click
    dropzone.addEventListener('click', () => fileInput.click());

    // Drag events
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropzone.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        dropzone.addEventListener(eventName, () => dropzone.classList.add('dragover'), false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropzone.addEventListener(eventName, () => dropzone.classList.remove('dragover'), false);
    });

    // Handle dropped files
    dropzone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        handleFiles(dt.files);
    });

    // Handle selected files
    fileInput.addEventListener('change', function() {
        handleFiles(this.files);
    });

    function handleFiles(files) {
        Array.from(files).forEach(file => {
            if (file.type === 'application/pdf') {
                uploadedFiles.items.add(file);
            } else {
                alert('Only PDF files are allowed!');
            }
        });
        updateFileList();
        checkFormValidity();
    }

    function removeFile(index) {
        const newDt = new DataTransfer();
        Array.from(uploadedFiles.files).forEach((file, i) => {
            if (i !== index) newDt.items.add(file);
        });
        uploadedFiles = newDt;
        updateFileList();
        checkFormValidity();
    }

    function updateFileList() {
        fileListDom.innerHTML = '';
        Array.from(uploadedFiles.files).forEach((file, index) => {
            const div = document.createElement('div');
            div.className = 'file-item';
            div.innerHTML = `
                <span>📄 ${file.name} ( ${(file.size/1024/1024).toFixed(2)} MB)</span>
                <span class="remove-file" data-index="${index}">&times;</span>
            `;
            fileListDom.appendChild(div);
        });

        // Add remove handlers
        document.querySelectorAll('.remove-file').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                removeFile(parseInt(e.target.dataset.index));
            });
        });
        
        fileInput.files = uploadedFiles.files; // Sync real input
    }

    function checkFormValidity() {
        if (uploadedFiles.files.length > 0 && searchInput.value.trim() !== '') {
            submitBtn.disabled = false;
        } else {
            submitBtn.disabled = true;
        }
    }

    searchInput.addEventListener('input', checkFormValidity);

    // Form Submission
    uploadForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Show loading state
        const btnText = submitBtn.querySelector('.btn-text');
        const loader = document.getElementById('loader');
        
        btnText.classList.add('hidden');
        loader.classList.remove('hidden');
        submitBtn.disabled = true;
        
        const formData = new FormData(uploadForm);
        
        try {
            const response = await fetch('/process', {
                method: 'POST',
                body: formData
            });
            
            const data = await response.json();
            
            if (response.ok && data.success) {
                // Show results
                uploadForm.classList.add('hidden');
                resultsSection.classList.remove('hidden');
                
                resultMessage.innerHTML = `Found <strong>${data.matches}</strong> occurrences of "${searchInput.value}".<br>The relevant pages have been highlighted and successfully merged into a new PDF.`;
                
                downloadLink.href = data.download_url;
                pdfFrame.src = data.download_url; // Set preview source
            } else {
                alert(data.message || data.error || 'Something went wrong.');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('An error occurred during processing.');
        } finally {
            // Revert loading state
            btnText.classList.remove('hidden');
            loader.classList.add('hidden');
            checkFormValidity();
        }
    });

    // Preview
    previewBtn.addEventListener('click', () => {
        previewModal.classList.remove('hidden');
    });

    closeModal.addEventListener('click', () => {
        previewModal.classList.add('hidden');
    });

    // Reset
    resetBtn.addEventListener('click', () => {
        uploadedFiles = new DataTransfer();
        updateFileList();
        searchInput.value = '';
        checkFormValidity();
        
        resultsSection.classList.add('hidden');
        uploadForm.classList.remove('hidden');
        pdfFrame.src = '';
    });
});
