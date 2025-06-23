// Quick Add functionality for TopoVerso Admin
class QuickAdd {
    constructor() {
        this.isContributor = window.PHP_IS_CONTRIBUTOR || false;
        this.baseUrl = window.BASE_URL || '';
        this.init();
    }

    init() {
        this.createStyles();
        this.attachEventListeners();
    }

    createStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .quick-add-modal {
                display: none;
                position: fixed;
                z-index: 1000;
                left: 0;
                top: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0,0,0,0.5);
            }
            .quick-add-content {
                background-color: #fefefe;
                margin: 5% auto;
                padding: 20px;
                border: 1px solid #888;
                border-radius: 8px;
                width: 80%;
                max-width: 500px;
                position: relative;
                max-height: 80vh;
                overflow-y: auto;
            }
            .quick-add-close {
                color: #aaa;
                float: right;
                font-size: 28px;
                font-weight: bold;
                cursor: pointer;
                line-height: 1;
            }
            .quick-add-close:hover {
                color: #000;
            }
            .quick-add-btn {
                background-color: #28a745;
                color: white;
                border: none;
                padding: 5px 10px;
                margin-left: 10px;
                border-radius: 3px;
                cursor: pointer;
                font-size: 12px;
                transition: background-color 0.2s;
                vertical-align: middle;
            }
            .quick-add-btn:hover {
                background-color: #218838;
            }
            .quick-add-btn.contributor-mode {
                background-color: #17a2b8;
            }
            .quick-add-btn.contributor-mode:hover {
                background-color: #138496;
            }
            .quick-add-form .form-group {
                margin-bottom: 15px;
            }
            .quick-add-form label {
                display: block;
                margin-bottom: 5px;
                font-weight: bold;
            }
            .quick-add-form input, .quick-add-form textarea, .quick-add-form input[type="file"] {
                width: 100%;
                padding: 8px;
                border: 1px solid #ddd;
                border-radius: 4px;
                box-sizing: border-box;
            }
            .quick-add-form input[type="file"] {
                padding: 3px;
            }
            .quick-add-form textarea {
                resize: vertical;
                min-height: 80px;
            }
            .quick-add-loading {
                display: none;
                text-align: center;
                padding: 20px;
            }
            .quick-add-message {
                padding: 10px;
                margin: 10px 0;
                border-radius: 4px;
                display: none;
            }
            .quick-add-message.success {
                background-color: #d4edda;
                border: 1px solid #c3e6cb;
                color: #155724;
            }
            .quick-add-message.error {
                background-color: #f8d7da;
                border: 1px solid #f5c6cb;
                color: #721c24;
            }
            .quick-add-form .btn {
                display: inline-block;
                padding: 8px 16px;
                margin: 5px 5px 5px 0;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                text-decoration: none;
                font-size: 14px;
            }
            .quick-add-form .btn-success {
                background-color: #28a745;
                color: white;
            }
            .quick-add-form .btn-success:hover {
                background-color: #218838;
            }
            .quick-add-form .btn-secondary {
                background-color: #6c757d;
                color: white;
            }
            .quick-add-form .btn-secondary:hover {
                background-color: #5a6268;
            }
        `;
        document.head.appendChild(style);
    }

    attachEventListeners() {
        // Aspetta che il DOM sia completamente caricato
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.setupQuickAddButtons();
            });
        } else {
            this.setupQuickAddButtons();
        }
    }

    setupQuickAddButtons() {
        // Cerca tutti i select per persone e aggiungi i pulsanti
        const personSelectors = [
            'select.person-select-searchable',
            'select[name*="person"]',
            'select[id*="person"]',
            'select[name*="story_person"]',
            'select[name*="cover_artist"]',
            'select[name*="author"]'
        ];
        
        personSelectors.forEach(selector => {
            document.querySelectorAll(selector).forEach(select => {
                this.addQuickAddButton(select, 'person');
            });
        });

        // Cerca tutti i select per personaggi e aggiungi i pulsanti
        const characterSelectors = [
            'select.characters-select-searchable',
            'select[name*="character"]',
            'select[id*="character"]'
        ];
        
        characterSelectors.forEach(selector => {
            document.querySelectorAll(selector).forEach(select => {
                this.addQuickAddButton(select, 'character');
            });
        });
    }

    addQuickAddButton(selectElement, type) {
        // Evita di aggiungere il pulsante più volte
        if (selectElement.parentNode.querySelector('.quick-add-btn')) {
            return;
        }

        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'quick-add-btn' + (this.isContributor ? ' contributor-mode' : '');
        button.textContent = type === 'person' ? '+ Persona' : '+ Personaggio';
        button.title = `Aggiungi nuov${type === 'person' ? 'a persona' : 'o personaggio'} al volo`;
        button.onclick = () => this.openModal(type, selectElement);

        // Inserisci il pulsante dopo il select
        selectElement.parentNode.insertBefore(button, selectElement.nextSibling);
    }

    openModal(type, targetSelect) {
        const modalId = `quick-add-modal-${type}`;
        let modal = document.getElementById(modalId);

        if (!modal) {
            modal = this.createModal(type, modalId);
            document.body.appendChild(modal);
        }

        modal.style.display = 'block';
        modal.dataset.targetSelect = targetSelect.id || targetSelect.name || Math.random().toString(36).substr(2, 9);

        // Se il select non ha un ID, assegnane uno temporaneo
        if (!targetSelect.id && !targetSelect.name) {
            targetSelect.setAttribute('data-quickadd-id', modal.dataset.targetSelect);
        }

        // Reset form
        const form = modal.querySelector('.quick-add-form');
        form.reset();
        modal.querySelector('.quick-add-message').style.display = 'none';
        
        // Focus sul primo campo
        const firstInput = form.querySelector('input[type="text"]');
        if (firstInput) {
            setTimeout(() => firstInput.focus(), 100);
        }
    }

    createModal(type, modalId) {
        const modal = document.createElement('div');
        modal.id = modalId;
        modal.className = 'quick-add-modal';

        const isContributorNote = this.isContributor ? 
            '<p style="background-color: #fff3cd; padding: 10px; border-radius: 4px; margin-bottom: 15px; border: 1px solid #ffeaa7;"><strong>Nota:</strong> Come contributore, la tua proposta verrà inviata per approvazione.</p>' : '';

        modal.innerHTML = `
            <div class="quick-add-content">
                <span class="quick-add-close">&times;</span>
                <h3>Aggiungi ${type === 'person' ? 'Persona' : 'Personaggio'}</h3>
                ${isContributorNote}
                <div class="quick-add-message"></div>
                <div class="quick-add-loading">
                    <p>Invio in corso...</p>
                </div>
                <form class="quick-add-form">
                    <div class="form-group">
                        <label for="qa-name-${type}">Nome ${type === 'person' ? 'Persona' : 'Personaggio'}:</label>
                        <input type="text" id="qa-name-${type}" name="name" required>
                    </div>
                    <div class="form-group">
                        <label for="qa-desc-${type}">${type === 'person' ? 'Biografia' : 'Descrizione'} (opzionale):</label>
                        <textarea id="qa-desc-${type}" name="${type === 'person' ? 'biography' : 'description'}" rows="3"></textarea>
                    </div>
                    <div class="form-group">
                        <label for="qa-image-${type}">Foto ${type === 'person' ? 'Persona' : 'Personaggio'} (opzionale):</label>
                        <input type="file" id="qa-image-${type}" name="${type === 'person' ? 'person_image' : 'character_image'}" accept="image/*">
                        <small style="display: block; margin-top: 5px; color: #666;">Formati supportati: JPG, PNG, GIF, WebP. Verrà ottimizzata automaticamente.</small>
                    </div>
                    <div class="form-group">
                        <button type="submit" class="btn btn-success">
                            ${this.isContributor ? 'Invia Proposta' : 'Aggiungi'}
                        </button>
                        <button type="button" class="btn btn-secondary" onclick="this.closest('.quick-add-modal').style.display='none'">Annulla</button>
                    </div>
                </form>
            </div>
        `;

        // Event listeners
        modal.querySelector('.quick-add-close').onclick = () => {
            modal.style.display = 'none';
        };

        modal.onclick = (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        };

        modal.querySelector('.quick-add-form').onsubmit = (e) => {
            e.preventDefault();
            this.submitForm(type, modal);
        };

        return modal;
    }

    async submitForm(type, modal) {
        const form = modal.querySelector('.quick-add-form');
        const formData = new FormData(form);
        const messageDiv = modal.querySelector('.quick-add-message');
        const loadingDiv = modal.querySelector('.quick-add-loading');

        // Show loading
        form.style.display = 'none';
        loadingDiv.style.display = 'block';
        messageDiv.style.display = 'none';

        try {
            const response = await fetch(`${this.baseUrl}admin/ajax_add_${type}.php`, {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            // Hide loading
            loadingDiv.style.display = 'none';
            form.style.display = 'block';

            if (result.success) {
                messageDiv.className = 'quick-add-message success';
                messageDiv.textContent = result.message;
                messageDiv.style.display = 'block';

                // Se non è una proposta (admin), aggiorna il select
                if (!result.is_proposal && result[type + '_id']) {
                    this.updateSelect(type, result, modal.dataset.targetSelect);
                    
                    // Chiudi il modal dopo un breve delay
                    setTimeout(() => {
                        modal.style.display = 'none';
                    }, 1500);
                } else {
                    // Per i contributori, mostra solo il messaggio di successo
                    setTimeout(() => {
                        modal.style.display = 'none';
                    }, 2000);
                }
            } else {
                messageDiv.className = 'quick-add-message error';
                messageDiv.textContent = result.message;
                messageDiv.style.display = 'block';
            }
        } catch (error) {
            loadingDiv.style.display = 'none';
            form.style.display = 'block';
            messageDiv.className = 'quick-add-message error';
            messageDiv.textContent = 'Errore di connessione: ' + error.message;
            messageDiv.style.display = 'block';
        }
    }

    updateSelect(type, result, targetSelectId) {
        let targetSelect = document.getElementById(targetSelectId) || 
                          document.querySelector(`[name="${targetSelectId}"]`) ||
                          document.querySelector(`[data-quickadd-id="${targetSelectId}"]`);
        
        if (!targetSelect) {
            console.log('Select non trovato per:', targetSelectId);
            return;
        }

        const option = document.createElement('option');
        option.value = result[type + '_id'];
        option.textContent = result[type + '_name'];
        option.selected = true;

        targetSelect.appendChild(option);

        // Se usa Select2, aggiorna
        if (window.jQuery && jQuery.fn.select2 && jQuery(targetSelect).hasClass('select2-hidden-accessible')) {
            jQuery(targetSelect).trigger('change');
        }

        // Trigger change event per altri script
        targetSelect.dispatchEvent(new Event('change', { bubbles: true }));
        
        console.log(`${type} aggiunto e selezionato:`, result[type + '_name']);
    }
}

// Inizializza quando il DOM è pronto
document.addEventListener('DOMContentLoaded', function() {
    new QuickAdd();
});

// Funzione globale per reinizializzare i pulsanti su contenuto dinamico
window.reinitQuickAdd = function() {
    if (window.quickAddInstance) {
        window.quickAddInstance.setupQuickAddButtons();
    }
};

// Esponi l'istanza globalmente
window.addEventListener('load', function() {
    window.quickAddInstance = new QuickAdd();
});