document.addEventListener('DOMContentLoaded', () => {
    // === GSAP Page Entry Animations ===
    if (typeof gsap !== 'undefined') {
        gsap.from('.navbar', { y: -50, opacity: 0, duration: 0.8, ease: "power3.out" });
        gsap.from('.main-card', { y: 30, opacity: 0, duration: 0.8, delay: 0.2, ease: "power3.out" });
    }

    // === Global Toast Wrapper ===
    function notify(msg, type='info') {
        if (typeof window.showToast === 'function') {
            window.showToast(msg, type);
        } else {
            alert(msg);
        }
    }

    // === Tabs Logic ===
    const tabWorkspace = document.getElementById('tab-workspace');
    const tabHistory = document.getElementById('tab-history');
    const viewWorkspace = document.getElementById('view-workspace');
    const viewHistory = document.getElementById('view-history');

    if (tabWorkspace && tabHistory) {
        tabWorkspace.addEventListener('click', () => {
            tabWorkspace.classList.add('active');
            tabHistory.classList.remove('active');
            viewWorkspace.classList.remove('hidden');
            viewHistory.classList.add('hidden');
        });
        tabHistory.addEventListener('click', () => {
            tabHistory.classList.add('active');
            tabWorkspace.classList.remove('active');
            viewHistory.classList.remove('hidden');
            viewWorkspace.classList.add('hidden');
            loadHistory();
        });
    }

    // === Upload Form & Core Elements ===
    const dropzone = document.getElementById('dropzone');
    if (!dropzone) return;

    const fileInput = document.getElementById('file-input');
    const fileListDom = document.getElementById('file-list');
    const submitBtn = document.getElementById('submit-btn');
    const searchInput = document.getElementById('search_name');
    const uploadForm = document.getElementById('upload-form');
    
    const uploadMode = document.getElementById('upload-mode');
    const hierarchicalContainer = document.getElementById('hierarchical-container');
    const addSemesterBtn = document.getElementById('add-semester-btn');
    const resetTreeBtn = document.getElementById('reset-tree-btn');
    const progressContainer = document.getElementById('progress-container');
    const progressFill = document.getElementById('progress-fill');
    const progressStatusText = document.getElementById('progress-status-text');
    const progressPercentage = document.getElementById('progress-percentage');

    const resultsSection = document.getElementById('results-section');
    const resultMessage = document.getElementById('result-message');
    const downloadLink = document.getElementById('download-link');
    const previewBtn = document.getElementById('preview-btn');
    const resetBtn = document.getElementById('reset-btn');
    const previewModal = document.getElementById('preview-modal');
    const closeModal = document.getElementById('close-modal');
    const pdfFrame = document.getElementById('pdf-preview-frame');

    let uploadedFiles = new DataTransfer();
    let currentMode = 'standard';
    
    // === Voice Search (Web Speech API) ===
    const voiceBtn = document.getElementById('voice-search-btn');
    if (voiceBtn && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;

        voiceBtn.addEventListener('click', () => {
            voiceBtn.style.color = 'var(--danger)';
            if (typeof gsap !== 'undefined') {
                gsap.to(voiceBtn, { scale: 1.2, yoyo: true, repeat: -1, duration: 0.3 });
            }
            recognition.start();
        });

        recognition.onresult = (event) => {
            const text = event.results[0][0].transcript;
            searchInput.value = text;
            checkFormValidity();
            notify("Voice captured: " + text, "success");
        };

        recognition.onend = () => {
            voiceBtn.style.color = 'var(--text-muted)';
            if (typeof gsap !== 'undefined') {
                gsap.killTweensOf(voiceBtn);
                gsap.to(voiceBtn, { scale: 1, duration: 0.2 });
            }
        };
    } else if (voiceBtn) {
        voiceBtn.title = "Voice Search not supported in this browser.";
        voiceBtn.style.opacity = 0.5;
        voiceBtn.style.cursor = 'not-allowed';
    }

    // === Local NLP Intent Parser ===
    function parseIntent(query) {
        const q = query.toLowerCase();
        if (q.includes("highest") || q.includes("lowest") || q.includes("average") || q.includes("marks")) {
            return "show_insights";
        }
        if (q.includes("sem") || q.includes("semester")) {
            const match = q.match(/sem(?:ester)?\s*(\d+)/);
            if (match) return { type: "filter_semester", value: match[1] };
        }
        return "search";
    }

    // === D3.js Tree Logic ===
    let treeData = { name: "Workspace", children: [], type: 'root' };
    
    function updateD3() {
        const container = document.getElementById('d3-tree-root');
        container.innerHTML = "";
        
        const width = container.clientWidth || 600;
        const height = 300;
        
        const svg = d3.select("#d3-tree-root").append("svg")
            .attr("width", width)
            .attr("height", height)
            .append("g")
            .attr("transform", "translate(50, 20)");
            
        const tree = d3.tree().size([height - 40, width - 200]);
        const root = d3.hierarchy(treeData);
        tree(root);
        
        svg.selectAll(".link")
            .data(root.links())
            .join("path")
            .attr("class", "link")
            .attr("fill", "none")
            .attr("stroke", "var(--glass-border)")
            .attr("stroke-width", 2)
            .attr("d", d3.linkHorizontal().x(d => d.y).y(d => d.x));
            
        const node = svg.selectAll(".node")
            .data(root.descendants())
            .join("g")
            .attr("class", "node")
            .attr("transform", d => `translate(${d.y},${d.x})`);
            
        node.append("circle")
            .attr("r", 6)
            .attr("fill", d => {
                if (d.data.type === 'root') return "var(--primary)";
                if (d.data.type === 'sem') return "#f59e0b";
                if (d.data.type === 'sub') return "var(--secondary)";
                return "#10b981";
            })
            .style("cursor", "pointer")
            .on("click", (event, d) => handleNodeClick(d));
            
        node.append("text")
            .attr("dy", 4)
            .attr("x", d => d.children ? -10 : 10)
            .style("text-anchor", d => d.children ? "end" : "start")
            .style("fill", "var(--text-main)")
            .style("font-size", "13px")
            .text(d => d.data.name);
    }

    function handleNodeClick(d) {
        if (d.data.type === 'root') {
            treeData.children.push({ name: `Semester ${d.data.children ? d.data.children.length + 1 : 1}`, children: [], type: 'sem' });
            updateD3();
            notify("Semester Added. Click it to add subjects.", "success");
        } else if (d.data.type === 'sem') {
            d.data.children.push({ name: `Subject ${d.data.children ? d.data.children.length + 1 : 1}`, children: [], type: 'sub' });
            updateD3();
            notify("Subject Added. Click it to upload files.", "success");
        } else if (d.data.type === 'sub') {
            const input = document.createElement('input');
            input.type = 'file';
            input.multiple = true;
            input.accept = ".pdf,.docx,.xlsx,.xls,.csv,.txt";
            input.onchange = (e) => {
                Array.from(e.target.files).forEach(f => {
                    uploadedFiles.items.add(f);
                    d.data.children.push({ name: f.name.substring(0, 15) + '...', type: 'file', originalFile: f });
                });
                updateD3();
                checkFormValidity();
                notify(`${e.target.files.length} files attached.`, "success");
            };
            input.click();
        }
    }

    if (addSemesterBtn) {
        addSemesterBtn.addEventListener('click', () => {
            treeData.children.push({ name: `Semester ${treeData.children.length + 1}`, children: [], type: 'sem' });
            updateD3();
        });
    }

    if (resetTreeBtn) {
        resetTreeBtn.addEventListener('click', () => {
            treeData.children = [];
            uploadedFiles = new DataTransfer();
            updateD3();
            checkFormValidity();
            notify("Tree reset.", "info");
        });
    }

    // Initialize Empty D3
    setTimeout(updateD3, 500); 

    // === Mode Toggle ===
    uploadMode.addEventListener('change', (e) => {
        currentMode = e.target.value;
        if (currentMode === 'standard') {
            dropzone.classList.remove('hidden');
            hierarchicalContainer.classList.add('hidden');
            fileListDom.classList.remove('hidden');
        } else {
            dropzone.classList.add('hidden');
            hierarchicalContainer.classList.remove('hidden');
            fileListDom.classList.add('hidden');
            setTimeout(updateD3, 100);
        }
        checkFormValidity();
    });

    // === Standard Drag & Drop ===
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropzone.addEventListener(eventName, (e) => { e.preventDefault(); e.stopPropagation(); }, false);
    });

    ['dragenter', 'dragover'].forEach(eventName => {
        dropzone.addEventListener(eventName, () => dropzone.classList.add('dragover'), false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropzone.addEventListener(eventName, () => dropzone.classList.remove('dragover'), false);
    });

    dropzone.addEventListener('drop', (e) => {
        handleFiles(e.dataTransfer.files);
    });

    dropzone.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', function() {
        handleFiles(this.files);
    });

    function handleFiles(files) {
        Array.from(files).forEach(file => {
            uploadedFiles.items.add(file);
        });
        updateFileList();
        checkFormValidity();
        notify(`${files.length} files added.`, "success");
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
        if (currentMode === 'hierarchical') return;
        fileListDom.innerHTML = '';
        Array.from(uploadedFiles.files).forEach((file, index) => {
            const div = document.createElement('div');
            div.className = 'file-item';
            div.innerHTML = `
                <span>📄 ${file.name} ( ${(file.size/1024/1024).toFixed(2)} MB)</span>
                <span class="remove-file" data-index="${index}" style="cursor:pointer; color:var(--danger); font-size:1.2rem;">&times;</span>
            `;
            fileListDom.appendChild(div);
        });

        document.querySelectorAll('.remove-file').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                removeFile(parseInt(e.target.dataset.index));
            });
        });
    }

    function checkFormValidity() {
        if (uploadedFiles.files.length > 0 && searchInput.value.trim() !== '') {
            submitBtn.disabled = false;
        } else {
            submitBtn.disabled = true;
        }
    }

    searchInput.addEventListener('input', checkFormValidity);

    // === Form Submission & Polling ===
    uploadForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const btnText = submitBtn.querySelector('.btn-text');
        const loader = document.getElementById('loader');
        
        btnText.classList.add('hidden');
        loader.classList.remove('hidden');
        submitBtn.disabled = true;

        progressContainer.classList.remove('hidden');
        
        const formData = new FormData(uploadForm);
        formData.delete('files');
        Array.from(uploadedFiles.files).forEach(f => {
            formData.append('files', f);
        });

        // Smart Intent Parsing
        const intent = parseIntent(searchInput.value);
        if (intent.type === "filter_semester") {
            notify(`Intent Detected: Focusing on Semester ${intent.value}`, 'info');
            // This is where backend parameters could be adjusted
        } else if (intent === "show_insights") {
            notify(`Intent Detected: Analyzing Numerical Insights`, 'info');
        }

        const pollInterval = setInterval(async () => {
            try {
                const res = await fetch('/status');
                if (res.ok) {
                    const data = await res.json();
                    progressStatusText.innerText = data.status;
                    progressPercentage.innerText = data.progress + '%';
                    progressFill.style.width = data.progress + '%';
                }
            } catch (err) {}
        }, 800);
        
        try {
            const response = await fetch('/process', {
                method: 'POST',
                body: formData
            });
            
            clearInterval(pollInterval);
            progressPercentage.innerText = '100%';
            progressFill.style.width = '100%';
            progressStatusText.innerText = 'Completed!';

            const data = await response.json();
            
            if (response.ok && data.success) {
                notify("Processing Complete!", "success");
                if (typeof gsap !== 'undefined') {
                    gsap.to(uploadForm, { opacity: 0, duration: 0.5, onComplete: () => {
                        uploadForm.classList.add('hidden');
                        resultsSection.classList.remove('hidden');
                        gsap.fromTo(resultsSection, { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5 });
                    }});
                } else {
                    uploadForm.classList.add('hidden');
                    resultsSection.classList.remove('hidden');
                }
                
                resultMessage.innerHTML = `Found <strong>${data.matches}</strong> occurrences of "${searchInput.value}".`;
                downloadLink.href = data.download_url;
                
                // === Render Insights & Chart ===
                if (data.insights && data.insights.trend && data.insights.trend.length > 0) {
                    const ctx = document.getElementById('insight-chart').getContext('2d');
                    if (window.insightChart) window.insightChart.destroy();
                    
                    window.insightChart = new Chart(ctx, {
                        type: 'line',
                        data: {
                            labels: data.insights.trend.map((_, i) => `Doc ${i+1}`),
                            datasets: [{
                                label: 'Performance Trend',
                                data: data.insights.trend,
                                borderColor: '#3b82f6',
                                backgroundColor: 'rgba(59, 130, 246, 0.2)',
                                tension: 0.4,
                                fill: true
                            }]
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: { legend: { display: false } }
                        }
                    });
                
                    document.getElementById('insight-summary').innerText = data.summary;
                    const tagsHtml = (data.tags || []).map(t => `<span class="insight-tag">${t}</span>`).join('');
                    document.getElementById('insight-tags').innerHTML = tagsHtml;
                } else {
                    document.getElementById('insight-summary').innerText = data.summary + " (No numerical trend data could be extracted).";
                    const tagsHtml = (data.tags || []).map(t => `<span class="insight-tag">${t}</span>`).join('');
                    document.getElementById('insight-tags').innerHTML = tagsHtml;
                    if (window.insightChart) window.insightChart.destroy();
                }
                
                if (data.download_url.endsWith('.pdf')) {
                    pdfFrame.src = data.download_url;
                    previewBtn.classList.remove('hidden');
                } else {
                    previewBtn.classList.add('hidden');
                }
            } else {
                notify(data.message || data.error || 'Something went wrong.', "error");
            }
        } catch (error) {
            clearInterval(pollInterval);
            notify('An error occurred during processing.', "error");
        } finally {
            btnText.classList.remove('hidden');
            loader.classList.add('hidden');
            checkFormValidity();
        }
    });

    previewBtn.addEventListener('click', () => {
        previewModal.classList.remove('hidden');
    });

    closeModal.addEventListener('click', () => {
        previewModal.classList.add('hidden');
    });

    resetBtn.addEventListener('click', () => {
        uploadedFiles = new DataTransfer();
        updateFileList();
        treeData.children = [];
        updateD3();
        searchInput.value = '';
        progressContainer.classList.add('hidden');
        progressFill.style.width = '0%';
        checkFormValidity();
        
        if (typeof gsap !== 'undefined') {
            gsap.to(resultsSection, { opacity: 0, duration: 0.5, onComplete: () => {
                resultsSection.classList.add('hidden');
                uploadForm.classList.remove('hidden');
                gsap.fromTo(uploadForm, {opacity: 0}, {opacity: 1, duration: 0.5});
            }});
        } else {
            resultsSection.classList.add('hidden');
            uploadForm.classList.remove('hidden');
        }
        pdfFrame.src = '';
    });

    // === Timeline History View ===
    let fullHistory = [];
    const filterSelect = document.getElementById('filter-type');
    
    if (filterSelect) {
        filterSelect.addEventListener('change', renderTimeline);
    }

    async function loadHistory() {
        const list = document.getElementById('history-timeline');
        list.innerHTML = '<div class="loader"></div> Loading timeline...';
        
        try {
            const res = await fetch('/api/history');
            const data = await res.json();
            
            fullHistory = data.history || [];
            renderTimeline();
        } catch (e) {
            list.innerHTML = '<p style="color: var(--danger);">Failed to load history.</p>';
        }
    }

    function renderTimeline() {
        const list = document.getElementById('history-timeline');
        const filter = filterSelect ? filterSelect.value : 'all';
        
        const filtered = fullHistory.filter(item => {
            if (filter === 'all') return true;
            const tags = item.tags.map(t => t.toLowerCase());
            return tags.includes(filter);
        });
        
        if (filtered.length === 0) {
            list.innerHTML = '<p style="color: var(--text-muted);">No timeline events found for this filter.</p>';
            return;
        }

        list.innerHTML = '';
        filtered.forEach((item, idx) => {
            const tagsHtml = (item.tags || []).map(t => `<span class="insight-tag">${t}</span>`).join('');
            const card = document.createElement('div');
            card.className = 'timeline-item';
            
            // GSAP stagger effect setup
            card.style.opacity = '0';
            card.style.transform = 'translateY(20px)';
            
            card.innerHTML = `
                <div class="glass-card" style="padding: 1.5rem;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.8rem;">
                        <h4 style="color: var(--primary); font-size: 1.2rem; margin: 0;">Query: "${item.search_name}"</h4>
                        <span style="color: var(--text-muted); font-size: 0.85rem;">${item.created_at} | ${item.output_format.toUpperCase()}</span>
                    </div>
                    <p style="color: var(--text-main); font-size: 0.95rem; margin-bottom: 1rem; line-height: 1.5;">${item.summary || 'Processed documents extraction.'}</p>
                    <div style="display: flex; gap: 0.5rem; margin-bottom: 1.5rem; flex-wrap: wrap;">
                        ${tagsHtml}
                    </div>
                    <div class="history-actions">
                        <a href="${item.download_url}" class="btn-primary" style="padding: 0.5rem 1rem; font-size: 0.9rem;" download>⬇️ Download Extract</a>
                        <button class="btn-secondary del-history-btn" data-id="${item.id}" style="padding: 0.5rem 1rem; font-size: 0.9rem; color: var(--danger); border-color: var(--danger);">🗑️ Delete</button>
                    </div>
                </div>
            `;
            list.appendChild(card);
            
            if (typeof gsap !== 'undefined') {
                gsap.to(card, { y: 0, opacity: 1, duration: 0.4, delay: idx * 0.1 });
            } else {
                card.style.opacity = '1';
                card.style.transform = 'none';
            }
        });
        
        // Bind delete buttons
        document.querySelectorAll('.del-history-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.target.getAttribute('data-id');
                if (confirm('Are you sure you want to delete this timeline event?')) {
                    const delRes = await fetch(`/api/history/delete/${id}`, { method: 'DELETE' });
                    if (delRes.ok) {
                        notify("Timeline event deleted.", "success");
                        loadHistory();
                    }
                }
            });
        });
    }
});
