document.addEventListener("DOMContentLoaded", () => {

// =========================
// SELECTED MODE
// =========================

let selectedMode = "basic";
let activeWorkspace = "document";
let studyDocumentState = {
    documentName: "No document uploaded",
    preview: "Upload a PDF to begin reading your extracted document content.",
    insights: null
};
const chatHistory = [];
let latestSummaryText = "";

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

        // Send retrieval mode to backend

        formData.append("mode", selectedMode);

        try {

            const response = await fetch("/upload-study-pdf", {
                method: "POST",
                body: formData
            });

            const data = await response.json();

            studyDocumentState = {
                documentName: data.filename || "Uploaded document",
                preview: data.preview || "",
                insights: {
                    mode: data.mode,
                    chunkCount: data.chunk_count,
                    strategy: data.strategy,
                    embeddingDimension:
                        data.embedding_dimension
                }
            };

            // Update Upload Box

            studyUploadBox.innerHTML = `
                <p class="upload-title">✓ ${data.filename}</p>
                <p class="upload-subtext">
                    ${data.chunk_count} ${data.chunk_count === 1 ? "chunk" : "chunks"} processed successfully
                </p>
            `;

            const documentStatus =
                document.getElementById("documentStatus");

            if (documentStatus) {

                documentStatus.innerHTML = `
                    <p>Document Ready</p>
                    <span>
                        ${data.chunk_count} ${data.chunk_count === 1 ? "chunk" : "chunks"} indexed
                    </span>
                `;
            }

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

                    <div id="documentPreview" class="preview-content">

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

            if (activeWorkspace === "document") {

                renderDocumentWorkspace();
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
// STUDY AI RENDERING
// =========================

const createWorkspaceCard = ({
    title,
    content,
    className = "ai-message workspace-card"
} = {}) => {

    const card =
        document.createElement("div");

    card.className = className;

    if (title) {

        const heading =
            document.createElement("h3");

        heading.textContent = title;

        card.appendChild(heading);
    }

    if (content) {

        appendMarkdownContent(card, content);
    }

    return card;
};

const appendInlineMarkdown = (element, text) => {

    const pattern =
        /(\*\*[^*]+\*\*|`[^`]+`)/g;

    const parts =
        String(text || "")
            .split(pattern);

    parts.forEach(part => {

        if (!part) return;

        if (
            part.startsWith("**") &&
            part.endsWith("**")
        ) {

            const strong =
                document.createElement("strong");

            strong.textContent =
                part.slice(2, -2);

            element.appendChild(strong);

            return;
        }

        if (
            part.startsWith("`") &&
            part.endsWith("`")
        ) {

            const code =
                document.createElement("code");

            code.textContent =
                part.slice(1, -1);

            element.appendChild(code);

            return;
        }

        element.appendChild(
            document.createTextNode(part)
        );
    });
};

const appendMarkdownContent = (element, markdown) => {

    const lines =
        String(markdown || "")
            .replace(/\r\n/g, "\n")
            .split("\n");

    let index = 0;

    const appendParagraph = paragraphLines => {

        if (paragraphLines.length === 0) return;

        const paragraph =
            document.createElement("p");

        appendInlineMarkdown(
            paragraph,
            paragraphLines.join(" ")
        );

        element.appendChild(paragraph);
    };

    while (index < lines.length) {

        const line =
            lines[index];

        const trimmed =
            line.trim();

        if (!trimmed) {

            index += 1;

            continue;
        }

        if (trimmed.startsWith("```")) {

            const language =
                trimmed.slice(3).trim();

            const codeLines = [];

            index += 1;

            while (
                index < lines.length &&
                !lines[index].trim().startsWith("```")
            ) {

                codeLines.push(lines[index]);

                index += 1;
            }

            if (index < lines.length) {

                index += 1;
            }

            const pre =
                document.createElement("pre");

            const code =
                document.createElement("code");

            if (language) {

                code.dataset.language = language;
            }

            code.textContent =
                codeLines.join("\n");

            pre.appendChild(code);

            element.appendChild(pre);

            continue;
        }

        const headingMatch =
            trimmed.match(/^(#{1,3})\s+(.+)$/);

        if (headingMatch) {

            const heading =
                document.createElement(
                    `h${headingMatch[1].length}`
                );

            appendInlineMarkdown(
                heading,
                headingMatch[2]
            );

            element.appendChild(heading);

            index += 1;

            continue;
        }

        if (trimmed.startsWith(">")) {

            const quoteLines = [];

            while (
                index < lines.length &&
                lines[index].trim().startsWith(">")
            ) {

                quoteLines.push(
                    lines[index]
                        .trim()
                        .replace(/^>\s?/, "")
                );

                index += 1;
            }

            const blockquote =
                document.createElement("blockquote");

            appendInlineMarkdown(
                blockquote,
                quoteLines.join(" ")
            );

            element.appendChild(blockquote);

            continue;
        }

        const unorderedMatch =
            trimmed.match(/^[-*]\s+(.+)$/);

        const orderedMatch =
            trimmed.match(/^\d+\.\s+(.+)$/);

        if (unorderedMatch || orderedMatch) {

            const isOrdered =
                Boolean(orderedMatch);

            const list =
                document.createElement(
                    isOrdered ? "ol" : "ul"
                );

            while (index < lines.length) {

                const itemLine =
                    lines[index].trim();

                const itemMatch =
                    isOrdered
                        ? itemLine.match(/^\d+\.\s+(.+)$/)
                        : itemLine.match(/^[-*]\s+(.+)$/);

                if (!itemMatch) break;

                const item =
                    document.createElement("li");

                appendInlineMarkdown(
                    item,
                    itemMatch[1]
                );

                list.appendChild(item);

                index += 1;
            }

            element.appendChild(list);

            continue;
        }

        const paragraphLines = [];

        while (index < lines.length) {

            const paragraphLine =
                lines[index].trim();

            if (
                !paragraphLine ||
                paragraphLine.startsWith("```") ||
                paragraphLine.startsWith(">") ||
                paragraphLine.match(/^(#{1,3})\s+(.+)$/) ||
                paragraphLine.match(/^[-*]\s+(.+)$/) ||
                paragraphLine.match(/^\d+\.\s+(.+)$/)
            ) {

                break;
            }

            paragraphLines.push(paragraphLine);

            index += 1;
        }

        appendParagraph(paragraphLines);
    }
};

const getWorkspaceArea = () =>
    document.querySelector(".workspace-area");

const setActiveFeatureButton = workspace => {

    const featureButtons =
        document.querySelectorAll(".feature-btn");

    featureButtons.forEach(button => {

        button.classList.toggle(
            "active-feature",
            button.dataset.workspace === workspace &&
                workspace !== "document"
        );
    });
};

const createWorkspaceShell = ({
    label,
    title,
    description,
    modeClass = ""
}) => {

    const workspaceArea =
        getWorkspaceArea();

    if (!workspaceArea) return null;

    workspaceArea.className =
        `workspace-area selected-workspace ${modeClass}`.trim();

    workspaceArea.replaceChildren();

    const header =
        document.createElement("section");

    header.className = "workspace-header";

    const labelElement =
        document.createElement("p");

    labelElement.className = "workspace-label";
    labelElement.textContent = label;

    const heading =
        document.createElement("h1");

    heading.textContent = title;

    const subtitle =
        document.createElement("p");

    subtitle.textContent = description;

    header.append(labelElement, heading, subtitle);
    workspaceArea.appendChild(header);

    return workspaceArea;
};

const renderDocumentWorkspace = () => {

    activeWorkspace = "document";
    setActiveFeatureButton("document");

    const workspaceArea =
        createWorkspaceShell({
            label: "Document Workspace",
            title: "Read, reason, and study from one focused space.",
            description:
                "Your document preview and processing context stay organized here while the sidebar remains available for actions."
        });

    if (!workspaceArea) return;

    const content =
        document.createElement("section");

    content.className = "workspace-content";

    const previewArticle =
        document.createElement("article");

    previewArticle.className = "document-preview";
    previewArticle.id = "documentPreviewCard";

    const previewLabel =
        document.createElement("p");

    previewLabel.className = "workspace-section-label";
    previewLabel.textContent = "Document Preview";

    const previewHeading =
        document.createElement("h2");

    previewHeading.textContent = "Extracted Document Preview";

    const previewContent =
        document.createElement("div");

    previewContent.id = "documentPreview";
    previewContent.className = "preview-content";
    previewContent.textContent =
        studyDocumentState.preview ||
        "Upload a PDF to begin reading your extracted document content.";

    previewArticle.append(
        previewLabel,
        previewHeading,
        previewContent
    );

    const insightsSection =
        document.createElement("section");

    insightsSection.className = "processing-insights";
    insightsSection.id = "processingInsights";

    const insightsLabel =
        document.createElement("p");

    insightsLabel.className = "workspace-section-label";
    insightsLabel.textContent = "Processing Insights";

    insightsSection.appendChild(insightsLabel);

    const grid =
        document.createElement("div");

    grid.className = "insight-grid";

    const insights =
        studyDocumentState.insights;

    [
        ["Mode", insights ? String(insights.mode).toUpperCase() : "Awaiting Processing"],
        ["Chunks", insights ? insights.chunkCount : "-"],
        ["Strategy", insights ? insights.strategy : "-"],
        ["Embeddings", insights ? `${insights.embeddingDimension} dimensions` : "Pending"]
    ].forEach(([label, value]) => {

        const item =
            document.createElement("div");

        item.className = "insight-item";

        const itemLabel =
            document.createElement("span");

        itemLabel.textContent = label;

        const itemValue =
            document.createElement("strong");

        itemValue.textContent = value;

        item.append(itemLabel, itemValue);
        grid.appendChild(item);
    });

    insightsSection.appendChild(grid);
    content.append(previewArticle, insightsSection);
    workspaceArea.appendChild(content);
};

const renderChatEmptyState = container => {

    const emptyState =
        document.createElement("div");

    emptyState.className = "chat-empty-state";
    emptyState.id = "chatEmptyState";

    emptyState.innerHTML = `
        <p class="workspace-section-label">AI Chat</p>
        <h2>Start a document conversation.</h2>
        <p>Ask focused questions, turn dense sections into explanations, or prepare revision material from your uploaded PDF.</p>
        <div class="suggested-prompts">
            <button type="button">Summarize this chapter</button>
            <button type="button">Explain this topic simply</button>
            <button type="button">Generate exam questions</button>
            <button type="button">What are the key concepts?</button>
        </div>
    `;

    container.appendChild(emptyState);
};

const hideWorkspacePlaceholder = () => {

    removeWorkspaceNode("chatEmptyState");
};

const renderChatWorkspace = () => {

    activeWorkspace = "chat";
    setActiveFeatureButton("chat");

    const workspaceArea =
        createWorkspaceShell({
            label: "AI Workspace",
            title: "AI Chat",
            description:
                "Ask questions about uploaded material.",
            modeClass: "chat-workspace-mode"
        });

    if (!workspaceArea) return;

    const returnButton =
        document.createElement("button");

    returnButton.className = "workspace-return-btn";
    returnButton.type = "button";
    returnButton.id = "returnToDocumentWorkspace";
    returnButton.textContent = "Document Workspace";

    const header =
        workspaceArea.querySelector(".workspace-header");

    if (header) {

        header.appendChild(returnButton);
    }

    const chatShell =
        document.createElement("section");

    chatShell.className = "chat-workspace-shell";

    const chatMessages =
        document.createElement("div");

    chatMessages.className = "chat-messages";
    chatMessages.id = "chatMessages";

    if (chatHistory.length === 0) {

        renderChatEmptyState(chatMessages);
    }

    const inputBar =
        document.createElement("form");

    inputBar.className = "chat-input-bar";
    inputBar.id = "chatInputBar";

    inputBar.innerHTML = `
        <input
            type="text"
            id="questionInput"
            placeholder="Ask anything about the uploaded document..."
            autocomplete="off"
        >
        <button type="button" id="askButton">Ask AI</button>
    `;

    chatShell.append(chatMessages, inputBar);
    workspaceArea.appendChild(chatShell);

    if (chatHistory.length > 0) {

        chatHistory.forEach(message => {

            renderChatMessage({
                ...message,
                persist: false
            });
        });

        scrollWorkspaceToBottom(chatMessages);
    }
};

const renderSimpleWorkspace = ({
    workspace,
    label,
    title,
    description,
    contentId,
    renderContent
}) => {

    activeWorkspace = workspace;
    setActiveFeatureButton(workspace);

    const workspaceArea =
        createWorkspaceShell({
            label,
            title,
            description
        });

    if (!workspaceArea) return;

    const content =
        document.createElement("section");

    content.className = "workspace-content generated-workspace-content";
    content.id = contentId;

    workspaceArea.appendChild(content);

    if (typeof renderContent === "function") {

        renderContent();
    }
};

const renderSummaryWorkspace = async () => {

    activeWorkspace = "summary";
    setActiveFeatureButton("summary");

    const workspaceArea =
        createWorkspaceShell({
            label: "Summary Workspace",
            title: "AI Summary",
            description:
                "Generated semantic overview of uploaded material.",
            modeClass: "summary-workspace-mode"
        });

    if (!workspaceArea) return;

    const returnButton =
        document.createElement("button");

    returnButton.className = "workspace-return-btn";
    returnButton.type = "button";
    returnButton.id = "returnToDocumentWorkspace";
    returnButton.textContent = "← Document Workspace";

    const header =
        workspaceArea.querySelector(".workspace-header");

    if (header) {

        header.appendChild(returnButton);
    }

    const content =
        document.createElement("section");

    content.className = "workspace-content summary-workspace-content";
    content.id = "summaryContent";

    workspaceArea.appendChild(content);

    const summaryContent =
        document.getElementById("summaryContent");

    const loadingState =
        renderSummaryLoadingState(summaryContent);

    try {

        const response =
            await fetch("/generate-summary", {
                method: "POST"
            });

        const data =
            await response.json();

        if (loadingState) {

            loadingState.remove();
        }

        if (data.error) {

            renderErrorState(
                summaryContent,
                data.error,
                "Summary unavailable"
            );

            return;
        }

        latestSummaryText =
            data.summary || "";

        renderSummary(latestSummaryText);

    } catch (error) {

        if (loadingState) {

            loadingState.remove();
        }

        renderErrorState(
            summaryContent,
            "Failed to generate summary.",
            "Summary unavailable"
        );

        console.error(error);
    }
};

const renderExamWorkspace = async () => {

    renderSimpleWorkspace({
        workspace: "exam",
        label: "AI Workspace",
        title: "Exam Notes",
        description:
            "Organize high-priority revision material for study sessions.",
        contentId: "examContent",
    });

    const workspaceArea =
        getWorkspaceArea();

    if (!workspaceArea) return;

    const returnButton =
        document.createElement("button");

    returnButton.className = "workspace-return-btn";
    returnButton.type = "button";
    returnButton.id = "returnToDocumentWorkspace";
    returnButton.textContent = "← Document Workspace";

    const header =
        workspaceArea.querySelector(".workspace-header");

    if (header) {

        header.appendChild(returnButton);
    }

    const examContent =
        document.getElementById("examContent");

    renderExamSnapshot(examContent);

    const loadingState =
        renderExamLoadingState(examContent);

    try {

        const response =
            await fetch("/generate-exam-notes", {
                method: "POST"
            });

        const data =
            await response.json();

        if (loadingState) {

            loadingState.remove();
        }

        if (data.error) {

            renderExamErrorState(
                examContent,
                data.error
            );

            return;
        }

        renderExamNotes(data.notes);

    } catch (error) {

        if (loadingState) {

            loadingState.remove();
        }

        renderExamErrorState(
            examContent,
            "Failed to generate exam notes."
        );

        console.error(error);
    }
};

const renderBeginnerWorkspace = async () => {

    renderSimpleWorkspace({
        workspace: "beginner",
        label: "AI Workspace",
        title: "Beginner Mode",
        description:
            "Convert complex document ideas into simpler explanations.",
        contentId: "beginnerContent",
    });

    const beginnerContent =
        document.getElementById("beginnerContent");

    if (!beginnerContent) return;

    renderBeginnerLearningSnapshot(
        beginnerContent,
        getFallbackBeginnerGuide()
    );

    const loadingState =
        renderBeginnerLoadingState(beginnerContent);

    try {

        const response =
            await fetch("/generate-beginner-mode", {
                method: "POST"
            });

        const data =
            await response.json();

        if (loadingState) {

            loadingState.remove();
        }

        if (data.error) {

            renderBeginnerContent(
                getFallbackBeginnerGuide()
            );

            return;
        }

        renderBeginnerContent(data.guide);

    } catch (error) {

        if (loadingState) {

            loadingState.remove();
        }

        renderBeginnerContent(
            getFallbackBeginnerGuide()
        );

        console.error(error);
    }
};

document.addEventListener("click", event => {

    const featureButton =
        event.target.closest(".feature-btn");

    if (!featureButton) return;

    const workspace =
        featureButton.dataset.workspace;

    console.log("Feature clicked:", workspace);

    if (workspace === "chat") {

        console.log("Rendering AI Chat");

        renderChatWorkspace();
        return;
    }

    if (workspace === "summary") {

        renderSummaryWorkspace();
        return;
    }

    if (workspace === "exam") {

        renderExamWorkspace();
        return;
    }

    if (workspace === "beginner") {

        renderBeginnerWorkspace();
    }
});

document.addEventListener("click", event => {

    const returnButton =
        event.target.closest("#returnToDocumentWorkspace");

    if (!returnButton) return;

    renderDocumentWorkspace();
});

document.addEventListener("click", async event => {

    const actionButton =
        event.target.closest("[data-summary-action]");

    if (!actionButton) return;

    const action =
        actionButton.dataset.summaryAction;

    if (action === "beginner") {

        renderBeginnerWorkspace();
        return;
    }

    if (action === "copy") {

        await copySummaryToClipboard(actionButton);
        return;
    }

    if (action === "export") {

        exportSummaryNotes();
    }
});

document.addEventListener("click", event => {

    const promptButton =
        event.target.closest(".suggested-prompts button");

    if (!promptButton) return;

    const questionInput =
        document.getElementById("questionInput");

    if (!questionInput) return;

    questionInput.value =
        promptButton.textContent.trim();

    questionInput.focus();
});


const scrollWorkspaceToBottom = container => {

    if (!container) return;

    const scrollContainer =
        container.closest(".workspace-area") ||
        container;

    requestAnimationFrame(() => {

        scrollContainer.scrollTop =
            scrollContainer.scrollHeight;
    });
};

const removeWorkspaceNode = id => {

    const node =
        document.getElementById(id);

    if (node) {

        node.remove();
    }
};

const renderLoadingState = (
    container,
    id,
    messages
) => {

    if (!container) return null;

    removeWorkspaceNode(id);

    const loadingCard =
        createWorkspaceCard({
            className:
                "ai-message workspace-card loading-state"
        });

    loadingCard.id = id;

    messages.forEach(message => {

        const paragraph =
            document.createElement("p");

        paragraph.textContent = message;

        loadingCard.appendChild(paragraph);
    });

    container.appendChild(loadingCard);

    scrollWorkspaceToBottom(container);

    return loadingCard;
};

const renderErrorState = (
    container,
    message,
    title = "Something went wrong"
) => {

    if (!container) return null;

    const errorCard =
        createWorkspaceCard({
            title,
            content: message,
            className:
                "ai-message workspace-card error-state"
        });

    container.appendChild(errorCard);

    scrollWorkspaceToBottom(container);

    return errorCard;
};

const renderSummaryLoadingState = container => {

    if (!container) return null;

    removeWorkspaceNode("summaryLoadingState");

    const loadingCard =
        document.createElement("section");

    loadingCard.className = "summary-meta-card summary-loading-card";
    loadingCard.id = "summaryLoadingState";

    const title =
        document.createElement("h2");

    title.textContent = "Preparing summary";

    const details =
        document.createElement("div");

    details.className = "summary-meta-list";

    [
        "Reading document context...",
        "Composing semantic summary..."
    ].forEach(message => {

        const item =
            document.createElement("span");

        item.textContent = message;

        details.appendChild(item);
    });

    loadingCard.append(title, details);
    container.appendChild(loadingCard);

    return loadingCard;
};

const renderChatMessage = ({
    role,
    content,
    sources = [],
    persist = true
}) => {

    const chatMessages =
        document.getElementById("chatMessages");

    if (!chatMessages) return null;

    hideWorkspacePlaceholder();

    if (persist) {

        chatHistory.push({
            role,
            content,
            sources
        });
    }

    if (role === "user") {

        const userMessage =
            document.createElement("div");

        userMessage.className = "user-message";

        userMessage.textContent = content;

        chatMessages.appendChild(userMessage);

        scrollWorkspaceToBottom(chatMessages);

        return userMessage;
    }

    const aiMessage =
        createWorkspaceCard({
            content,
            className:
                "ai-message workspace-card"
        });

    if (sources.length > 0) {

        aiMessage.appendChild(
            renderSourceCitations(sources)
        );
    }

    chatMessages.appendChild(aiMessage);

    scrollWorkspaceToBottom(chatMessages);

    return aiMessage;
};

const appendCitationField = (
    citationBody,
    label,
    value
) => {

    if (!value) return;

    const field =
        document.createElement("div");

    field.className = "citation-field";

    const fieldLabel =
        document.createElement("span");

    fieldLabel.className = "citation-label";

    fieldLabel.textContent = label;

    const fieldValue =
        document.createElement("span");

    fieldValue.className = "citation-value";

    fieldValue.textContent = value;

    field.appendChild(fieldLabel);
    field.appendChild(fieldValue);

    citationBody.appendChild(field);
};

const renderCitationCard = source => {

    const details =
        document.createElement("details");

    details.className = "citation-card";

    const summary =
        document.createElement("summary");

    summary.className = "citation-summary";

    const title =
        document.createElement("span");

    title.className = "citation-card-title";

    title.textContent =
        source.document || "Source document";

    const meta =
        document.createElement("span");

    meta.className = "citation-card-meta";

    meta.textContent =
        source.section || source.chunk || "Relevant passage";

    summary.appendChild(title);
    summary.appendChild(meta);

    if (source.preview) {

        const preview =
            document.createElement("span");

        preview.className = "citation-preview";

        const compactPreview =
            source.preview.length > 120
                ? `${source.preview.slice(0, 120)}...`
                : source.preview;

        preview.textContent = compactPreview;

        summary.appendChild(preview);
    }

    const body =
        document.createElement("div");

    body.className = "citation-body";

    appendCitationField(
        body,
        "Document",
        source.document
    );

    appendCitationField(
        body,
        "Section",
        source.section
    );

    appendCitationField(
        body,
        "Chunk",
        source.chunk
    );

    appendCitationField(
        body,
        "Preview",
        source.preview
    );

    details.appendChild(summary);
    details.appendChild(body);

    return details;
};

const renderSourceCitations = sources => {

    const sourceBlock =
        document.createElement("div");

    sourceBlock.className = "source-block";

    const sourceTitle =
        document.createElement("div");

    sourceTitle.className = "source-title";

    sourceTitle.textContent = "Retrieved From";

    sourceBlock.appendChild(sourceTitle);

    sources.forEach(source => {

        sourceBlock.appendChild(
            renderCitationCard(source)
        );
    });

    return sourceBlock;
};

const renderSummary = summaryText => {

    const summaryContent =
        document.getElementById("summaryContent");

    if (!summaryContent) return;

    summaryContent.replaceChildren();

    const insights =
        studyDocumentState.insights;

    const metadataCard =
        document.createElement("section");

    metadataCard.className = "summary-meta-card";

    const documentName =
        document.createElement("h2");

    documentName.textContent =
        studyDocumentState.documentName ||
        "No document uploaded";

    const metadataList =
        document.createElement("div");

    metadataList.className = "summary-meta-list";

    [
        insights
            ? `${insights.chunkCount} ${insights.chunkCount === 1 ? "chunk" : "chunks"} processed`
            : "No chunks processed",
        `Mode: ${formatStudyMode(insights ? insights.mode : selectedMode)}`
    ].forEach(item => {

        const metadataItem =
            document.createElement("span");

        metadataItem.textContent = item;

        metadataList.appendChild(metadataItem);
    });

    metadataCard.append(documentName, metadataList);

    const semanticSection =
        document.createElement("article");

    semanticSection.className = "summary-article";

    const semanticLabel =
        document.createElement("p");

    semanticLabel.className = "workspace-section-label";
    semanticLabel.textContent = "Semantic Summary";

    const articleBody =
        document.createElement("div");

    articleBody.className = "summary-article-body";

    appendMarkdownContent(
        articleBody,
        summaryText || "Summary unavailable."
    );

    semanticSection.append(
        semanticLabel,
        articleBody
    );

    const quickInsights =
        buildSummaryQuickInsights(summaryText);

    const actionArea =
        buildSummaryActions();

    summaryContent.append(
        metadataCard,
        semanticSection,
        quickInsights,
        actionArea
    );

    const workspaceArea =
        getWorkspaceArea();

    if (workspaceArea) {

        workspaceArea.scrollTop = 0;
    }
};

const formatStudyMode = mode => {

    if (!mode) return "Basic";

    const normalized =
        String(mode).toLowerCase();

    return normalized.charAt(0).toUpperCase() +
        normalized.slice(1);
};

const estimateReadingTime = text => {

    const words =
        String(text || "")
            .trim()
            .split(/\s+/)
            .filter(Boolean).length;

    if (words === 0) return "Pending";

    return `${Math.max(1, Math.ceil(words / 180))} min${words > 180 ? "s" : ""}`;
};

const inferDifficulty = mode => {

    const normalized =
        String(mode || selectedMode)
            .toLowerCase();

    if (normalized === "high") return "Advanced";

    if (normalized === "medium") return "Intermediate";

    return "Beginner";
};

const inferSummaryTopic = summaryText => {

    const headingMatch =
        String(summaryText || "")
            .match(/^#{1,3}\s+(.+)$/m);

    if (headingMatch) {

        return headingMatch[1].replace(/[:.]+$/, "");
    }

    const documentName =
        studyDocumentState.documentName;

    if (
        documentName &&
        documentName !== "No document uploaded"
    ) {

        return documentName.replace(/\.[^/.]+$/, "");
    }

    return "Study Material";
};

const inferKeyConcepts = summaryText => {

    const stopWords =
        new Set([
            "about",
            "after",
            "also",
            "and",
            "are",
            "because",
            "between",
            "from",
            "into",
            "that",
            "the",
            "their",
            "these",
            "this",
            "with",
            "within"
        ]);

    const counts = {};

    String(summaryText || "")
        .toLowerCase()
        .match(/\b[a-z][a-z-]{4,}\b/g)
        ?.forEach(word => {

            if (stopWords.has(word)) return;

            counts[word] =
                (counts[word] || 0) + 1;
        });

    const concepts =
        Object.entries(counts)
            .sort((first, second) => second[1] - first[1])
            .slice(0, 4)
            .map(([word]) =>
                word.charAt(0).toUpperCase() + word.slice(1)
            );

    return concepts.length > 0
        ? concepts.join(", ")
        : "Concepts pending";
};

const buildSummaryQuickInsights = summaryText => {

    const section =
        document.createElement("section");

    section.className = "summary-quick-insights";

    const label =
        document.createElement("p");

    label.className = "workspace-section-label";
    label.textContent = "Quick Insights";

    const grid =
        document.createElement("div");

    grid.className = "summary-insight-grid";

    [
        ["Main Topic", inferSummaryTopic(summaryText)],
        ["Difficulty", inferDifficulty(studyDocumentState.insights?.mode)],
        ["Reading Time", estimateReadingTime(summaryText)],
        ["Key Concepts", inferKeyConcepts(summaryText)]
    ].forEach(([title, value]) => {

        const card =
            document.createElement("div");

        card.className = "summary-insight-card";

        const cardLabel =
            document.createElement("p");

        cardLabel.textContent = title;

        const cardValue =
            document.createElement("strong");

        cardValue.textContent = value;

        card.append(cardLabel, cardValue);
        grid.appendChild(card);
    });

    section.append(label, grid);

    return section;
};

const buildSummaryActions = () => {

    const actionArea =
        document.createElement("section");

    actionArea.className = "summary-actions";

    [
        ["Copy Summary", "copy"],
        ["Export Notes", "export"],
        ["Open Beginner Mode", "beginner"]
    ].forEach(([label, action]) => {

        const button =
            document.createElement("button");

        button.type = "button";
        button.className = "summary-action-btn";
        button.dataset.summaryAction = action;
        button.textContent = label;

        actionArea.appendChild(button);
    });

    return actionArea;
};

const copySummaryToClipboard = async button => {

    const text =
        latestSummaryText.trim();

    if (!text) return;

    try {

        await navigator.clipboard.writeText(text);

        const originalText =
            button.textContent;

        button.textContent = "Copied";

        window.setTimeout(() => {

            button.textContent = originalText;
        }, 1600);

    } catch (error) {

        console.error(error);
    }
};

const exportSummaryNotes = () => {

    const text =
        latestSummaryText.trim();

    if (!text) return;

    const safeName =
        (studyDocumentState.documentName || "summary")
            .replace(/\.[^/.]+$/, "")
            .replace(/[^a-z0-9-_]+/gi, "-")
            .replace(/^-+|-+$/g, "")
            .toLowerCase() || "summary";

    const blob =
        new Blob(
            [text],
            { type: "text/plain;charset=utf-8" }
        );

    const url =
        URL.createObjectURL(blob);

    const link =
        document.createElement("a");

    link.href = url;
    link.download = `${safeName}-summary-notes.txt`;
    link.click();

    URL.revokeObjectURL(url);
};

const getExamRevisionMinutes = notes => {

    const explicitMinutes =
        Number(notes?.estimated_revision_minutes);

    if (Number.isFinite(explicitMinutes) && explicitMinutes > 0) {

        return Math.round(explicitMinutes);
    }

    const chunkCount =
        Number(studyDocumentState.insights?.chunkCount || 0);

    if (chunkCount > 0) {

        return Math.max(5, Math.ceil(chunkCount / 3));
    }

    return 10;
};

const renderExamSnapshot = (
    container,
    notes = null
) => {

    if (!container) return null;

    const insights =
        studyDocumentState.insights;

    const snapshot =
        document.createElement("section");

    snapshot.className = "exam-revision-snapshot";

    [
        studyDocumentState.documentName || "No document uploaded",
        insights
            ? `${insights.chunkCount} ${insights.chunkCount === 1 ? "chunk" : "chunks"} indexed`
            : "No chunks indexed",
        `Mode: ${formatStudyMode(insights ? insights.mode : selectedMode)}`,
        `${getExamRevisionMinutes(notes)} min revision`
    ].forEach(value => {

        const item =
            document.createElement("span");

        item.textContent = value;

        snapshot.appendChild(item);
    });

    container.appendChild(snapshot);

    return snapshot;
};

const renderExamLoadingState = container => {

    if (!container) return null;

    const loadingCard =
        document.createElement("section");

    loadingCard.className = "exam-revision-section exam-loading-state";
    loadingCard.id = "examLoadingState";

    const title =
        document.createElement("h2");

    title.textContent = "Building revision notebook";

    const note =
        document.createElement("p");

    note.textContent =
        "Identifying high-priority topics, likely questions, and key definitions...";

    loadingCard.append(title, note);
    container.appendChild(loadingCard);

    return loadingCard;
};

const renderExamErrorState = (
    container,
    message
) => {

    if (!container) return null;

    const errorCard =
        document.createElement("section");

    errorCard.className = "exam-revision-section exam-loading-state";

    const title =
        document.createElement("h2");

    title.textContent = "Exam notes unavailable";

    const details =
        document.createElement("p");

    details.textContent = message;

    errorCard.append(title, details);
    container.appendChild(errorCard);

    return errorCard;
};

const getFallbackExamNotes = () => ({
    estimated_revision_minutes: getExamRevisionMinutes(),
    important_topics: [
        {
            title: "Core Concepts",
            explanation:
                "Review the central ideas from the uploaded material before moving into detailed questions.",
            points: [
                "Identify recurring terms",
                "Connect definitions to examples",
                "Prioritize high-frequency sections"
            ],
            example: "A chapter concept converted into a short exam answer"
        }
    ],
    practice_questions: {
        three_mark: [
            "Define the main concept discussed in the document.",
            "List any three important points from the uploaded material."
        ],
        five_mark: [
            "Explain the relationship between two major ideas in the document.",
            "Describe the importance of the topic with examples."
        ],
        long: [
            "Discuss the uploaded material as a structured exam answer."
        ]
    },
    key_concepts: [
        {
            term: "Revision Focus",
            definition:
                "The most important concepts to revise before attempting exam questions."
        }
    ],
    revision_checklist: [
        {
            text: "Important topics revised",
            completed: true
        },
        {
            text: "Practice questions attempted",
            completed: false
        }
    ]
});

const appendExamSectionHeader = (
    section,
    label,
    title
) => {

    const sectionLabel =
        document.createElement("p");

    sectionLabel.className = "workspace-section-label";
    sectionLabel.textContent = label;

    const heading =
        document.createElement("h2");

    heading.textContent = title;

    section.append(sectionLabel, heading);
};

const renderExamTopics = topics => {

    const section =
        document.createElement("section");

    section.className = "exam-revision-section exam-topics-section";

    appendExamSectionHeader(
        section,
        "Important Topics",
        "High-priority revision topics"
    );

    const list =
        document.createElement("div");

    list.className = "exam-topic-list";

    (Array.isArray(topics) ? topics : [])
        .forEach((topic, index) => {

        const block =
            document.createElement("article");

        block.className = "exam-topic-block";

        const heading =
            document.createElement("h3");

        heading.textContent =
            `${index + 1}. ${topic.title || "Revision Topic"}`;

        const explanation =
            document.createElement("p");

        explanation.textContent =
            topic.explanation || "Review this topic from the uploaded material.";

        const points =
            document.createElement("ul");

        (Array.isArray(topic.points) ? topic.points : [])
            .slice(0, 4)
            .forEach(point => {

                const item =
                    document.createElement("li");

                item.textContent = point;

                points.appendChild(item);
            });

        const example =
            document.createElement("div");

        example.className = "exam-mini-example";

        const exampleLabel =
            document.createElement("span");

        exampleLabel.textContent = "Example:";

        const exampleText =
            document.createElement("p");

        exampleText.textContent =
            topic.example || "Connect this topic to a short exam example.";

        example.append(exampleLabel, exampleText);

        block.append(
            heading,
            explanation,
            points,
            example
        );

            list.appendChild(block);
        });

    section.appendChild(list);

    return section;
};

const renderQuestionList = (
    title,
    questions
) => {

    const group =
        document.createElement("div");

    group.className = "exam-question-group";

    const heading =
        document.createElement("h3");

    heading.textContent = title;

    const list =
        document.createElement("ul");

    (Array.isArray(questions) ? questions : [])
        .forEach(question => {

            const item =
                document.createElement("li");

            item.textContent = question;

            list.appendChild(item);
        });

    group.append(heading, list);

    return group;
};

const renderExamQuestions = questions => {

    const section =
        document.createElement("section");

    section.className = "exam-revision-section exam-questions-section";

    appendExamSectionHeader(
        section,
        "Practice Questions",
        "Likely exam preparation questions"
    );

    section.append(
        renderQuestionList(
            "3-Mark Questions",
            questions.three_mark || []
        ),
        renderQuestionList(
            "5-Mark Questions",
            questions.five_mark || []
        ),
        renderQuestionList(
            "Long Questions",
            questions.long || []
        )
    );

    return section;
};

const renderExamConcepts = concepts => {

    const section =
        document.createElement("section");

    section.className = "exam-revision-section exam-concepts-section";

    appendExamSectionHeader(
        section,
        "Key Concepts",
        "Quick revision flashcards"
    );

    const cards =
        document.createElement("div");

    cards.className = "exam-flashcard-list";

    (Array.isArray(concepts) ? concepts : [])
        .forEach(concept => {

        const card =
            document.createElement("article");

        card.className = "exam-flashcard";

        const term =
            document.createElement("h3");

        term.textContent =
            concept.term || "Key Concept";

        const definition =
            document.createElement("p");

        definition.textContent =
            `→ ${concept.definition || "Short definition unavailable."}`;

        card.append(term, definition);
            cards.appendChild(card);
        });

    section.appendChild(cards);

    return section;
};

const renderExamChecklist = checklist => {

    const section =
        document.createElement("section");

    section.className = "exam-revision-section exam-checklist-section";

    appendExamSectionHeader(
        section,
        "Revision Checklist",
        "Final progress before the exam"
    );

    const list =
        document.createElement("div");

    list.className = "exam-checklist";

    (Array.isArray(checklist) ? checklist : [])
        .forEach(item => {

        const row =
            document.createElement("label");

        row.className = "exam-check-item";

        if (item.completed) {

            row.classList.add("completed");
        }

        const checkbox =
            document.createElement("input");

        checkbox.type = "checkbox";
        checkbox.checked = Boolean(item.completed);

        const text =
            document.createElement("span");

        text.textContent =
            item.text || "Revision task";

        row.append(checkbox, text);
            list.appendChild(row);
        });

    section.appendChild(list);

    return section;
};

const renderExamNotes = notes => {

    const examContent =
        document.getElementById("examContent");

    if (!examContent) return;

    const revisionNotes =
        notes || getFallbackExamNotes();

    examContent.replaceChildren();

    renderExamSnapshot(
        examContent,
        revisionNotes
    );

    examContent.append(
        renderExamTopics(
            revisionNotes.important_topics || []
        ),
        renderExamQuestions(
            revisionNotes.practice_questions || {}
        ),
        renderExamConcepts(
            revisionNotes.key_concepts || []
        ),
        renderExamChecklist(
            revisionNotes.revision_checklist || []
        )
    );
};

const getFallbackBeginnerGuide = () => {

    const topic =
        inferSummaryTopic(
            studyDocumentState.preview ||
            studyDocumentState.documentName
        );

    return {
        topic,
        learning_level: "Beginner",
        estimated_learning_minutes: 12,
        difficulty: "Easy → Medium",
        simplified_explanation: {
            title: `What is ${topic}?`,
            paragraphs: [
                "This guide breaks the uploaded material into simple ideas so you can understand the topic without heavy textbook language.",
                "Start with the basic meaning, then follow the steps, examples, and revision points to build confidence."
            ],
            analogy:
                "Think of it like learning a new route: first you understand the destination, then each turn starts to make sense."
        },
        how_it_works: [
            {
                label: "Step 1",
                title: "Notice the main idea",
                description:
                    "Identify what the topic is mainly trying to explain."
            },
            {
                label: "Step 2",
                title: "Break it into parts",
                description:
                    "Separate difficult terms into smaller, easier pieces."
            },
            {
                label: "Step 3",
                title: "Connect it to examples",
                description:
                    "Use real situations to remember why the idea matters."
            }
        ],
        examples: [
            {
                title: "Everyday Learning",
                description:
                    "A complex definition becomes easier when it is linked to a familiar real-life situation."
            },
            {
                title: "Exam Preparation",
                description:
                    "Short explanations help you form clear answers instead of memorizing long paragraphs."
            },
            {
                title: "Revision",
                description:
                    "Quick takeaways make it easier to recall the topic before a test."
            }
        ],
        takeaways: [
            "Focus on the main idea first",
            "Break complex topics into smaller parts",
            "Use examples to remember concepts",
            "Revise with short points before exams"
        ],
        learned: [
            "What the topic is about",
            "How to simplify difficult ideas",
            "Why examples make learning easier",
            "How to revise the material quickly"
        ]
    };
};

const renderBeginnerLearningSnapshot = (
    container,
    guide
) => {

    if (!container) return null;

    const snapshot =
        document.createElement("section");

    snapshot.className = "beginner-learning-snapshot";

    [
        ["Topic", guide.topic || "Study Material"],
        ["Learning Level", guide.learning_level || "Beginner"],
        [
            "Estimated Learning Time",
            `${guide.estimated_learning_minutes || 12} mins`
        ],
        ["Difficulty", guide.difficulty || "Easy → Medium"]
    ].forEach(([label, value]) => {

        const item =
            document.createElement("div");

        const itemLabel =
            document.createElement("span");

        itemLabel.textContent = label;

        const itemValue =
            document.createElement("strong");

        itemValue.textContent = value;

        item.append(itemLabel, itemValue);
        snapshot.appendChild(item);
    });

    container.appendChild(snapshot);

    return snapshot;
};

const renderBeginnerLoadingState = container => {

    if (!container) return null;

    const loadingCard =
        document.createElement("section");

    loadingCard.className = "beginner-learning-section beginner-loading-state";
    loadingCard.id = "beginnerLoadingState";

    const heading =
        document.createElement("h2");

    heading.textContent = "Preparing beginner guide";

    const note =
        document.createElement("p");

    note.textContent =
        "Simplifying concepts, building examples, and arranging a gentle learning path...";

    loadingCard.append(heading, note);
    container.appendChild(loadingCard);

    return loadingCard;
};

const createBeginnerSection = (
    label,
    title,
    className
) => {

    const section =
        document.createElement("section");

    section.className =
        `beginner-learning-section ${className}`.trim();

    const sectionLabel =
        document.createElement("p");

    sectionLabel.className = "workspace-section-label";
    sectionLabel.textContent = label;

    const heading =
        document.createElement("h2");

    heading.textContent = title;

    section.append(sectionLabel, heading);

    return section;
};

const renderSimplifiedExplanation = guide => {

    const explanation =
        guide.simplified_explanation || {};

    const section =
        createBeginnerSection(
            "Simplified Explanation",
            explanation.title || "What does this mean?",
            "beginner-explanation-section"
        );

    const body =
        document.createElement("div");

    body.className = "beginner-explanation-body";

    (Array.isArray(explanation.paragraphs)
        ? explanation.paragraphs
        : []
    ).forEach(paragraphText => {

        const paragraph =
            document.createElement("p");

        paragraph.textContent = paragraphText;

        body.appendChild(paragraph);
    });

    const analogy =
        document.createElement("div");

    analogy.className = "beginner-analogy";

    const analogyLabel =
        document.createElement("span");

    analogyLabel.textContent = "Think of it like:";

    const analogyText =
        document.createElement("p");

    analogyText.textContent =
        explanation.analogy || "A difficult idea made easier with a familiar example.";

    analogy.append(analogyLabel, analogyText);
    body.appendChild(analogy);
    section.appendChild(body);

    return section;
};

const renderHowItWorks = steps => {

    const stepList =
        Array.isArray(steps)
            ? steps
            : [];

    const section =
        createBeginnerSection(
            "Learning Flow",
            "How It Works",
            "beginner-flow-section"
        );

    const flow =
        document.createElement("div");

    flow.className = "beginner-step-flow";

    stepList.forEach((step, index) => {

            const item =
                document.createElement("article");

            item.className = "beginner-step";

            const stepLabel =
                document.createElement("span");

            stepLabel.textContent =
                step.label || `Step ${index + 1}`;

            const stepTitle =
                document.createElement("h3");

            stepTitle.textContent =
                step.title || "Learning step";

            const stepDescription =
                document.createElement("p");

            stepDescription.textContent =
                step.description || "Understand this part before moving forward.";

            item.append(
                stepLabel,
                stepTitle,
                stepDescription
            );

            flow.appendChild(item);

            if (index < stepList.length - 1) {

                const connector =
                    document.createElement("div");

                connector.className = "beginner-step-connector";
                connector.textContent = "↓";

                flow.appendChild(connector);
            }
        });

    section.appendChild(flow);

    return section;
};

const renderBeginnerExamples = examples => {

    const section =
        createBeginnerSection(
            "Real-World Examples",
            "Examples you can remember",
            "beginner-examples-section"
        );

    const cards =
        document.createElement("div");

    cards.className = "beginner-example-list";

    (Array.isArray(examples) ? examples : [])
        .forEach(example => {

            const card =
                document.createElement("article");

            card.className = "beginner-example-card";

            const title =
                document.createElement("h3");

            title.textContent =
                example.title || "Example";

            const description =
                document.createElement("p");

            description.textContent =
                example.description || "A simple real-world connection.";

            card.append(title, description);
            cards.appendChild(card);
        });

    section.appendChild(cards);

    return section;
};

const renderBeginnerTakeaways = takeaways => {

    const section =
        createBeginnerSection(
            "Plain-Language Takeaways",
            "Quick Revision Points",
            "beginner-takeaways-section"
        );

    const list =
        document.createElement("ul");

    list.className = "beginner-takeaway-list";

    (Array.isArray(takeaways) ? takeaways : [])
        .forEach(takeaway => {

            const item =
                document.createElement("li");

            item.textContent = takeaway;

            list.appendChild(item);
        });

    section.appendChild(list);

    return section;
};

const renderWhatYouLearned = learned => {

    const section =
        createBeginnerSection(
            "Completion",
            "What You Learned",
            "beginner-completion-section"
        );

    const list =
        document.createElement("div");

    list.className = "beginner-learned-list";

    (Array.isArray(learned) ? learned : [])
        .forEach(itemText => {

            const item =
                document.createElement("div");

            item.className = "beginner-learned-item";

            const check =
                document.createElement("span");

            check.textContent = "✓";

            const text =
                document.createElement("p");

            text.textContent = itemText;

            item.append(check, text);
            list.appendChild(item);
        });

    section.appendChild(list);

    return section;
};

const renderBeginnerContent = guide => {

    const beginnerContent =
        document.getElementById("beginnerContent");

    if (!beginnerContent) return;

    const learningGuide =
        guide || getFallbackBeginnerGuide();

    const snapshot =
        renderBeginnerLearningSnapshot(
            document.createElement("div"),
            learningGuide
        );

    beginnerContent.replaceChildren(
        snapshot,
        renderSimplifiedExplanation(learningGuide),
        renderHowItWorks(
            learningGuide.how_it_works || []
        ),
        renderBeginnerExamples(
            learningGuide.examples || []
        ),
        renderBeginnerTakeaways(
            learningGuide.takeaways || []
        ),
        renderWhatYouLearned(
            learningGuide.learned || []
        )
    );
};

// =========================
// ASK QUESTIONS
// =========================

const handleAskQuestion = async () => {

        const questionInput =
            document.getElementById("questionInput");

        if (!questionInput) return;

        const query =
            questionInput.value.trim();

        if (!query) return;

        const chatMessages =
            document.getElementById("chatMessages");

        if (!chatMessages) return;

        hideWorkspacePlaceholder();

        renderChatMessage({
            role: "user",
            content: query
        });

        renderLoadingState(
            chatMessages,
            "chatLoadingState",
            [
                "Analyzing question...",
                "Searching document embeddings...",
                "Generating AI response..."
            ]
        );

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

            removeWorkspaceNode("chatLoadingState");

            if (data.error) {

                renderErrorState(
                    chatMessages,
                    data.error,
                    "AI response unavailable"
                );

                return;
            }

            renderChatMessage({
                role: "assistant",
                content:
                    data.answer || "No response generated.",
                sources:
                    Array.isArray(data.sources)
                        ? data.sources
                        : []
            });

        } catch (error) {

            removeWorkspaceNode("chatLoadingState");

            renderErrorState(
                chatMessages,
                "Failed to retrieve response.",
                "AI response unavailable"
            );

            console.error(error);
        }

};

document.addEventListener("click", event => {

    const askButton =
        event.target.closest("#askButton");

    if (!askButton) return;

    handleAskQuestion();
});

document.addEventListener("keydown", event => {

    if (
        event.key !== "Enter" ||
        event.shiftKey ||
        event.target.id !== "questionInput"
    ) return;

    event.preventDefault();

    handleAskQuestion();
});

renderDocumentWorkspace();

});
