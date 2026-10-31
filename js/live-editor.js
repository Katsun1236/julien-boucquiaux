/**
 * Éditeur Visuel en Direct (WYSIWYG) - Julien Boucquiaux
 * Permet de modifier n'importe quel texte directement sur la page et d'enregistrer les changements.
 */
(function () {
    const DEFAULT_PIN = "1234";
    const API_URL = "/api/content";
    const STORAGE_KEY = "julien_site_overrides";
    const BANNER_KEY = "julien_top_banner";
    const pageId = window.location.pathname.split("/").pop() || "index.html";

    let isEditorActive = false;
    let modifiedElements = {}; // key -> newHTML
    let originalElements = {}; // key -> origHTML

    // 1. Initialiser le bandeau d'annonce en haut s'il existe
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
            }
        } catch (e) {}
    }

    // 2. Générer une clé stable pour chaque élément textuel
    function getElementKey(el, index) {
        if (el.id) return `${pageId}#${el.id}`;
        const tag = el.tagName.toLowerCase();
        const parentClass = el.parentElement ? (el.parentElement.className || "").trim().split(/\s+/)[0] : "";
        return `${pageId}::${parentClass}>${tag}:${index}`;
    }

    // 3. Appliquer les textes sauvegardés dès le chargement de la page
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

    // Charger les modifications (depuis le serveur ou localStorage)
    async function loadContent() {
        initAnnouncementBanner();

        // 1. D'abord depuis le localStorage local pour affichage instantané
        try {
            const local = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
            applySavedContent(local);
        } catch (e) {}

        // 2. Ensuite depuis l'API Netlify Blobs si en ligne
        try {
            const res = await fetch(API_URL);
            if (res.ok) {
                const remote = await res.json();
                if (remote && Object.keys(remote).length > 0) {
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(remote));
                    applySavedContent(remote);
                }
            }
        } catch (e) {
            // mode hors ligne ou pas encore de backend
        }
    }

    // 4. Activer le mode édition en direct
    function enableEditor() {
        if (isEditorActive) return;
        isEditorActive = true;
        document.body.classList.add("live-editor-active");

        // Créer la barre d'outils supérieure
        let bar = document.getElementById("liveEditorBar");
        if (!bar) {
            bar = document.createElement("div");
            bar.id = "liveEditorBar";
            bar.className = "live-editor-bar";
            bar.innerHTML = `
                <div class="live-editor-info">
                    <span class="live-editor-badge">Mode Édition</span>
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

        // Rendre les éléments éditables
        const editables = document.querySelectorAll("h1, h2, h3, h4, h5, p, td, th, .titre, .accroche, .label, a.link span, .prix, .col_tarif");
        editables.forEach((el, index) => {
            const key = getElementKey(el, index);
            if (!originalElements[key]) {
                originalElements[key] = el.innerHTML;
            }

            el.setAttribute("data-editable", "true");
            el.setAttribute("contenteditable", "true");
            el.setAttribute("spellcheck", "false");

            // Bloquer la navigation sur les liens pendant l'édition
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

        // Masquer le bouton déclencheur
        const trigger = document.getElementById("editorTriggerBtn");
        if (trigger) trigger.style.display = "none";
    }

    function updateSaveButtonState() {
        const count = Object.keys(modifiedElements).length;
        const btn = document.getElementById("btnSaveLive");
        if (btn) {
            btn.innerHTML = count > 0 ? `💾 Enregistrer (${count})` : "💾 Enregistrer";
        }
    }

    // 5. Sauvegarder les modifications
    async function saveChanges() {
        const btn = document.getElementById("btnSaveLive");
        if (btn) btn.innerHTML = "⏳ Enregistrement...";

        // Fusionner avec le stockage existant
        let allOverrides = {};
        try {
            allOverrides = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
        } catch (e) {}

        Object.assign(allOverrides, modifiedElements);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(allOverrides));

        // Envoyer à l'API Netlify Blobs si possible
        let savedOnline = false;
        try {
            const res = await fetch(API_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    pin: sessionStorage.getItem("julien_editor_pin") || DEFAULT_PIN,
                    overrides: allOverrides,
                }),
            });
            if (res.ok) {
                savedOnline = true;
            }
        } catch (e) {}

        modifiedElements = {};
        updateSaveButtonState();

        if (savedOnline) {
            alert("✅ Vos modifications ont été enregistrées et publiées en ligne avec succès !");
        } else {
            alert("✅ Vos modifications ont été enregistrées sur cet appareil !");
        }
    }

    // 6. Annuler les modifications non enregistrées
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

    // 7. Quitter le mode édition
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

        const trigger = document.getElementById("editorTriggerBtn");
        if (trigger) trigger.style.display = "flex";
    }

    // 8. Modifier le bandeau d'alerte / annonce
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

    // 9. Fenêtre popup de connexion (Code PIN)
    function promptPinLogin() {
        const modal = document.createElement("div");
        modal.className = "live-editor-modal-overlay";
        modal.innerHTML = `
            <div class="live-editor-modal">
                <h3>🛠️ Espace Gestion</h3>
                <p>Entrez votre code d'accès pour modifier les textes et tarifs en direct :</p>
                <input type="password" id="editorPinInput" placeholder="Code PIN" maxlength="10" autofocus autocomplete="off">
                <div class="live-editor-modal-btns">
                    <button id="btnCancelPin" style="background:#eee;color:#333;">Annuler</button>
                    <button id="btnConfirmPin" style="background:#7fc957;color:#fff;">Accéder</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        const input = document.getElementById("editorPinInput");
        input.focus();

        function handleConfirm() {
            const entered = input.value.trim();
            if (entered === DEFAULT_PIN || entered === "julien" || entered === "admin") {
                sessionStorage.setItem("julien_editor_pin", entered);
                modal.remove();
                enableEditor();
            } else {
                alert("❌ Code incorrect. Veuillez réessayer.");
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

    // 10. Bouton déclencheur flottant
    function createTriggerButton() {
        const btn = document.createElement("button");
        btn.id = "editorTriggerBtn";
        btn.className = "editor-trigger-btn";
        btn.title = "Modifier le site en direct";
        btn.innerHTML = `✏️ <span>Modifier le site</span>`;
        btn.addEventListener("click", () => {
            if (sessionStorage.getItem("julien_editor_pin")) {
                enableEditor();
            } else {
                promptPinLogin();
            }
        });
        document.body.appendChild(btn);
    }

    // Initialisation au chargement
    window.addEventListener("DOMContentLoaded", () => {
        loadContent();
        createTriggerButton();

        // Activation automatique si ?edit est dans l'URL
        if (window.location.search.includes("edit")) {
            if (sessionStorage.getItem("julien_editor_pin")) {
                enableEditor();
            } else {
                promptPinLogin();
            }
        }
    });
})();
