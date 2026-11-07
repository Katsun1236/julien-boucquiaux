/**
 * Éditeur Visuel en Direct (WYSIWYG) - Julien Boucquiaux
 * Accès discret sans bouton public visible.
 */
(function () {
    const HASH = "5088efd7224c059084ef9dea8a933ab91f0d9f82496d1a14f5c217829da5b245";
    const API_URL = "/api/content";
    const STORAGE_KEY = "julien_site_overrides";
    const BANNER_KEY = "julien_top_banner";
    const pageId = window.location.pathname.split("/").pop() || "index.html";

    let isEditorActive = false;
    let modifiedElements = {};
    let originalElements = {};

    async function sha256(str) {
        const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
        return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
    }

    // 1. Initialiser le bandeau d'annonce
    function initAnnouncementBanner() {
        try {
            const bannerData = JSON.parse(localStorage.getItem(BANNER_KEY) || "null");
            if (bannerData && bannerData.active && bannerData.text) {
                let banner = document.getElementById("topAnnouncementBanner");
                if (!banner) {
                    banner = document.createElement("div");
                    banner.id = "topAnnouncementBanner";
                    banner.className = "top-announcement-banner";
                    document.body.insertBefore(banner, document.body.firstChild);
                }
                banner.innerHTML = `<span>📢 ${bannerData.text}</span>`;
            } else {
                let banner = document.getElementById("topAnnouncementBanner");
                if (banner) banner.remove();
            }
        } catch (e) {}
    }

    // 2. Clé stable pour chaque élément textuel
    function getElementKey(el, index) {
        if (el.id) return `${pageId}#${el.id}`;
        const tag = el.tagName.toLowerCase();
        const parentClass = el.parentElement ? (el.parentElement.className || "").trim().split(/\s+/)[0] : "";
        return `${pageId}::${parentClass}>${tag}:${index}`;
    }

    // 3. Appliquer les textes sauvegardés
    function applySavedContent(data) {
        if (!data) return;
        const editables = document.querySelectorAll("h1, h2, h3, h4, h5, p, td, th, .titre, .accroche, .label, a.link span");
        editables.forEach((el, index) => {
            const key = getElementKey(el, index);
            if (data[key] !== undefined) {
                el.innerHTML = data[key];
            }
        });
    }

    async function loadContent() {
        initAnnouncementBanner();
        try {
            const local = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
            applySavedContent(local);
        } catch (e) {}

        const hasParam = window.location.search.includes("gestion") || 
                         window.location.search.includes("edit") || 
                         window.location.search.includes("admin") ||
                         sessionStorage.getItem("julien_auth_token");
        if (hasParam) {
            try {
                const res = await fetch(API_URL).catch(() => null);
                if (res && res.ok) {
                    const remote = await res.json();
                    if (remote && Object.keys(remote).length > 0) {
                        localStorage.setItem(STORAGE_KEY, JSON.stringify(remote));
                        applySavedContent(remote);
                    }
                }
            } catch (e) {}
        }
    }

    // 4. Activer le mode édition en direct
    function enableEditor() {
        if (isEditorActive) return;
        isEditorActive = true;
        document.body.classList.add("live-editor-active");

        let bar = document.getElementById("liveEditorBar");
        if (!bar) {
            bar = document.createElement("div");
            bar.id = "liveEditorBar";
            bar.className = "live-editor-bar";
            bar.innerHTML = `
                <div class="live-editor-info">
                    <span class="live-editor-badge">Mode Gestion Direct</span>
                    <span class="live-editor-hint">Cliquez sur un texte ou un tarif pour le modifier directement sur la page.</span>
                </div>
                <div class="live-editor-actions">
                    <button id="btnEditBanner" class="live-editor-btn live-editor-btn-banner">📢 Bandeau d'annonce</button>
                    <button id="btnSaveLive" class="live-editor-btn live-editor-btn-save">💾 Enregistrer</button>
                    <button id="btnCancelLive" class="live-editor-btn live-editor-btn-cancel">Annuler</button>
                    <button id="btnExitLive" class="live-editor-btn live-editor-btn-exit">✖ Quitter</button>
                </div>
            `;
            document.body.appendChild(bar);

            document.getElementById("btnSaveLive").addEventListener("click", saveChanges);
            document.getElementById("btnCancelLive").addEventListener("click", cancelChanges);
            document.getElementById("btnExitLive").addEventListener("click", disableEditor);
            document.getElementById("btnEditBanner").addEventListener("click", editBanner);
        }
        bar.style.display = "flex";

        const editables = document.querySelectorAll("h1, h2, h3, h4, h5, p, td, th, .titre, .accroche, .label, a.link span, .prix, .col_tarif");
        editables.forEach((el, index) => {
            const key = getElementKey(el, index);
            if (!originalElements[key]) {
                originalElements[key] = el.innerHTML;
            }

            el.setAttribute("data-editable", "true");
            el.setAttribute("contenteditable", "true");
            el.setAttribute("spellcheck", "false");

            if (el.tagName === "A" || el.closest("a")) {
                el.addEventListener("click", (e) => {
                    if (isEditorActive) e.preventDefault();
                });
            }

            el.addEventListener("input", () => {
                modifiedElements[key] = el.innerHTML;
                updateSaveButtonState();
            });
        });
    }

    function updateSaveButtonState() {
        const count = Object.keys(modifiedElements).length;
        const btn = document.getElementById("btnSaveLive");
        if (btn) {
            btn.innerHTML = count > 0 ? `💾 Enregistrer (${count})` : "💾 Enregistrer";
        }
    }

    async function saveChanges() {
        const btn = document.getElementById("btnSaveLive");
        if (btn) btn.innerHTML = "⏳ Enregistrement...";

        let allOverrides = {};
        try {
            allOverrides = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
        } catch (e) {}

        Object.assign(allOverrides, modifiedElements);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(allOverrides));

        let savedOnline = false;
        try {
            const res = await fetch(API_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    auth_hash: sessionStorage.getItem("julien_auth_token") || HASH,
                    overrides: allOverrides,
                }),
            });
            if (res.ok) savedOnline = true;
        } catch (e) {}

        modifiedElements = {};
        updateSaveButtonState();

        if (savedOnline) {
            alert("✅ Vos modifications ont été enregistrées et publiées en ligne avec succès !");
        } else {
            alert("✅ Vos modifications ont été enregistrées sur cet appareil !");
        }
    }

    function cancelChanges() {
        if (confirm("Voulez-vous annuler vos modifications non enregistrées sur cette page ?")) {
            for (let key in originalElements) {
                const editables = document.querySelectorAll("[data-editable='true']");
                editables.forEach((el, index) => {
                    if (getElementKey(el, index) === key) {
                        el.innerHTML = originalElements[key];
                    }
                });
            }
            modifiedElements = {};
            updateSaveButtonState();
        }
    }

    function disableEditor() {
        isEditorActive = false;
        document.body.classList.remove("live-editor-active");
        const bar = document.getElementById("liveEditorBar");
        if (bar) bar.style.display = "none";

        const editables = document.querySelectorAll("[data-editable='true']");
        editables.forEach((el) => {
            el.removeAttribute("contenteditable");
            el.removeAttribute("data-editable");
        });
    }

    function editBanner() {
        const currentData = JSON.parse(localStorage.getItem(BANNER_KEY) || '{"active": false, "text": ""}');
        const action = prompt("Texte du bandeau d'annonce en haut du site (laissez vide pour désactiver) :", currentData.text || "");
        if (action !== null) {
            const newText = action.trim();
            const bannerData = {
                active: newText.length > 0,
                text: newText,
            };
            localStorage.setItem(BANNER_KEY, JSON.stringify(bannerData));
            initAnnouncementBanner();
            alert("Bandeau d'annonce mis à jour !");
        }
    }

    function promptPinLogin() {
        const modal = document.createElement("div");
        modal.className = "live-editor-modal-overlay";
        modal.innerHTML = `
            <div class="live-editor-modal">
                <h3>🔐 Accès Sécurisé</h3>
                <p>Veuillez entrer le mot de passe d'administration :</p>
                <input type="password" id="editorPinInput" placeholder="Mot de passe" autofocus autocomplete="off">
                <div class="live-editor-modal-btns">
                    <button id="btnCancelPin" style="background:#eee;color:#333;">Annuler</button>
                    <button id="btnConfirmPin" style="background:#7fc957;color:#fff;">Déverrouiller</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        const input = document.getElementById("editorPinInput");
        input.focus();

        async function handleConfirm() {
            const entered = input.value;
            const hashed = await sha256(entered);
            if (hashed === HASH) {
                sessionStorage.setItem("julien_auth_token", hashed);
                modal.remove();
                enableEditor();
            } else {
                alert("❌ Mot de passe incorrect.");
                input.value = "";
                input.focus();
            }
        }

        document.getElementById("btnConfirmPin").addEventListener("click", handleConfirm);
        input.addEventListener("keydown", (e) => {
            if (e.key === "Enter") handleConfirm();
        });
        document.getElementById("btnCancelPin").addEventListener("click", () => modal.remove());
    }

    // Initialisation
    window.addEventListener("DOMContentLoaded", () => {
        loadContent();

        // 1. Accès via URL discrète avec ?gestion ou ?edit ou ?admin
        const hasParam = window.location.search.includes("gestion") || 
                         window.location.search.includes("edit") || 
                         window.location.search.includes("admin");

        if (hasParam) {
            if (sessionStorage.getItem("julien_auth_token") === HASH) {
                enableEditor();
            } else {
                promptPinLogin();
            }
        }

        // 2. Raccourci clavier secret : Ctrl + Shift + E
        window.addEventListener("keydown", (e) => {
            if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "e") {
                e.preventDefault();
                if (sessionStorage.getItem("julien_auth_token") === HASH) {
                    if (isEditorActive) disableEditor();
                    else enableEditor();
                } else {
                    promptPinLogin();
                }
            }
        });
    });
})();
