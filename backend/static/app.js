// =========================
// SELECTED MODE
// =========================

let selectedMode = "basic";

// Mode Buttons

const modeButtons = document.querySelectorAll(".mode-btn");

modeButtons.forEach(button => {

    button.addEventListener("click", () => {

        // Remove active class

        modeButtons.forEach(btn => {
            btn.classList.remove("active-mode");
        });

        // Add active class

        button.classList.add("active-mode");

        // Save selected mode

        selectedMode = button.dataset.mode;

        console.log("Selected Mode:", selectedMode);

    });

});
// ====================
// STUDY PDF UPLOAD
// =========================

const studyUploadBox = document.getElementById("studyUploadBox");
const studyFileInput = document.getElementById("studyFileInput");

if (studyUploadBox) {

    studyUploadBox.addEventListener("click", () => {
        studyFileInput.click();
    });

    studyFileInput.addEventListener("change", async () => {

        const file = studyFileInput.files[0];

        if (!file) return;

        // Loading State

        studyUploadBox.innerHTML = `
            <p class="upload-title">Uploading PDF...</p>
            <p class="upload-subtext">Processing document</p>
        `;

        // Form Data

        const formData = new FormData();

        formData.append("file", file);

        try {

            const response = await fetch("/upload-study-pdf", {
                method: "POST",
                body: formData
            });

            const data = await response.json();

            // Update Upload Box

            studyUploadBox.innerHTML = `
                <p class="upload-title">✓ ${data.filename}</p>
                <p class="upload-subtext">
                    ${data.chunk_count} ${data.chunk_count === 1 ? "chunk" : "chunks"} processed successfully
                </p>
            `;

            // =========================
            // HIDE DEMO CONVERSATION
            // =========================

            const demoConversation =
                document.getElementById("demoConversation");

            if (demoConversation) {

                demoConversation.style.display = "none";

            }

            // =========================
            // DOCUMENT PREVIEW
            // =========================

            const previewCard = document.getElementById("documentPreviewCard");

            if (previewCard) {

                previewCard.innerHTML = `

                    <h3>
                        Extracted Document Preview
                    </h3>

                    <div class="preview-content">

                        ${data.preview.replace(/\n/g, "<br>")}

                    </div>

                `;
            }

            // =========================
            // PROCESSING INSIGHTS
            // =========================

            const insights =
                document.getElementById("processingInsights");

            if (insights) {

                insights.innerHTML = `

        <h3>
            Processing Insights
        </h3>

        <div class="insight-grid">

            <div class="insight-card">

                <p class="insight-label">
                    MODE
                </p>

                <span>
                    ${data.mode.toUpperCase()}
                </span>

            </div>

            <div class="insight-card">

                <p class="insight-label">
                    CHUNKS
                </p>

                <span>
                    ${data.chunk_count}
                </span>

            </div>

            <div class="insight-card">

                <p class="insight-label">
                    STRATEGY
                </p>

                <span>
                    ${data.strategy}
                </span>

            </div>

            <div class="insight-card">

                <p class="insight-label">
                    EMBEDDINGS
                </p>

                <span>
                    ${data.embedding_dimension} dimensions
                </span>

            </div>

        </div>

    `;
            }

        } catch (error) {

            studyUploadBox.innerHTML = `
                <p class="upload-title">Upload Failed</p>
                <p class="upload-subtext">Please try again</p>
            `;

            console.error(error);
        }

    });
}

// =========================
// RESUME PDF UPLOAD
// =========================

const resumeUploadBox = document.getElementById("resumeUploadBox");
const resumeFileInput = document.getElementById("resumeFileInput");

if (resumeUploadBox) {

    resumeUploadBox.addEventListener("click", () => {
        resumeFileInput.click();
    });

    resumeFileInput.addEventListener("change", async () => {

        const file = resumeFileInput.files[0];

        if (!file) return;

        // Loading State

        resumeUploadBox.innerHTML = `
            <p class="upload-title">Uploading Resume...</p>
            <p class="upload-subtext">Parsing document</p>
        `;

        // Form Data

        const formData = new FormData();

        formData.append("file", file);

        try {

            const response = await fetch("/upload-resume-pdf", {
                method: "POST",
                body: formData
            });

            const data = await response.json();

            resumeUploadBox.innerHTML = `
                <p class="upload-title">✓ ${data.filename}</p>
                <p class="upload-subtext">Resume uploaded successfully</p>
            `;

        } catch (error) {

            resumeUploadBox.innerHTML = `
                <p class="upload-title">Upload Failed</p>
                <p class="upload-subtext">Please try again</p>
            `;

            console.error(error);
        }

    });
}

// =========================
// ANALYZE BUTTON
// =========================

const analyzeBtn = document.querySelector(".analyze-btn");

if (analyzeBtn) {

    analyzeBtn.addEventListener("click", () => {

        analyzeBtn.innerText = "Analyzing...";

        analyzeBtn.disabled = true;

        setTimeout(() => {

            analyzeBtn.innerText = "Analysis Complete";

        }, 2500);
    });
}

// =========================
// ASK QUESTIONS
// =========================

const askButton =
    document.getElementById("askButton");

if (askButton) {

    askButton.addEventListener("click", async () => {

        const questionInput =
            document.getElementById("questionInput");

        const query = questionInput.value;

        if (!query) return;

        // Chat container

        const chatMessages =
            document.getElementById("chatMessages");

        if (!chatMessages) return;

        chatMessages.innerHTML += `

            <div class="user-message">

                ${query}

            </div>

        `;

        // Loading state

        chatMessages.innerHTML += `

            <div class="ai-message loading-state" id="chatLoadingState">

                <p>
                    Analyzing question...
                </p>

                <p>
                    Searching document embeddings...
                </p>

                <p>
                    Generating AI response...
                </p>

            </div>

        `;

        chatMessages.scrollTop = chatMessages.scrollHeight;

        try {

            const response = await fetch(
                "/ask-question",
                {

                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({
                        question: query
                    })

                }
            );

            const data = await response.json();

            questionInput.value = "";

            const loadingState =
                document.getElementById("chatLoadingState");

            if (loadingState) {

                loadingState.remove();

            }

            // Render answer

            chatMessages.innerHTML += `

                <div class="ai-message">

                    ${data.answer.replace(/\n/g, "<br>")}

                </div>

            `;

            chatMessages.scrollTop = chatMessages.scrollHeight;

        } catch (error) {

            const loadingState =
                document.getElementById("chatLoadingState");

            if (loadingState) {

                loadingState.remove();

            }

            chatMessages.innerHTML += `

                <div class="ai-message">
                    Failed to retrieve response.
                </div>

            `;

            console.error(error);
        }

    });

}

// =====================================
// WORKSPACE SWITCHING
// =====================================

const openChatWorkspaceBtn =
    document.getElementById("openChatWorkspace");

const documentWorkspace =
    document.getElementById("documentWorkspace");

const chatWorkspace =
    document.getElementById("chatWorkspace");

const backToWorkspaceBtn =
    document.getElementById("backToWorkspace");


// OPEN AI CHAT WORKSPACE

if (openChatWorkspaceBtn && documentWorkspace && chatWorkspace) {

    openChatWorkspaceBtn.addEventListener(
        "click",
        () => {

            documentWorkspace.classList.add("hidden");

            chatWorkspace.classList.remove("hidden");

        }
    );
}

// BACK TO DOCUMENT WORKSPACE

if (backToWorkspaceBtn && documentWorkspace && chatWorkspace) {

    backToWorkspaceBtn.addEventListener(
        "click",
        () => {

            chatWorkspace.classList.add("hidden");

            documentWorkspace.classList.remove("hidden");

        }
    );
}
