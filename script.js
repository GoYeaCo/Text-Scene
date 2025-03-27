document.addEventListener('DOMContentLoaded', function() {
    // Initialize variables
    const editor = document.getElementById('editor');
    const scriptTitle = document.getElementById('script-title');
    const scriptAuthor = document.getElementById('script-author');
    const charactersList = document.getElementById('characters-list');
    const notification = document.getElementById('notification');
    const notificationMessage = document.getElementById('notification-message');
    const characterModal = document.getElementById('character-modal');
    
    let characters = [];
    let undoStack = [];
    let redoStack = [];
    let currentSelection = null;
    
    // Initialize editor with default content
    editor.innerHTML = '<div class="act">Act I</div>' +
    '<div class="scene">Scene 1: A Dimly Lit Stage</div>' +
    '<div class="stage-direction">The stage is empty except for a single chair in the center. Soft blue light illuminates the space.</div>' +
    '<div class="character">PROTAGONIST</div>' +
    '<div class="dialogue">Is anyone there? I\'ve been waiting for what feels like eternity.</div>' +
    '<div class="stage-direction">A moment of silence. Then, footsteps can be heard from offstage.</div>';

// Save initial state for undo
saveState();

// Event Listeners for Toolbar Buttons
document.getElementById('new-script').addEventListener('click', newScript);
document.getElementById('save-script').addEventListener('click', saveScript);
document.getElementById('open-script').addEventListener('click', openScript);
document.getElementById('export-pdf').addEventListener('click', exportToPDF);
document.getElementById('print-script').addEventListener('click', printScript);
document.getElementById('undo').addEventListener('click', undo);
document.getElementById('redo').addEventListener('click', redo);

// Formatting buttons
document.getElementById('format-bold').addEventListener('click', () => formatText('bold'));
document.getElementById('format-italic').addEventListener('click', () => formatText('italic'));
document.getElementById('format-underline').addEventListener('click', () => formatText('underline'));

// Font controls
document.getElementById('font-size').addEventListener('change', changeFontSize);
document.getElementById('font-family').addEventListener('change', changeFontFamily);

// Text alignment buttons
document.getElementById('align-left').addEventListener('click', () => alignText('left'));
document.getElementById('align-center').addEventListener('click', () => alignText('center'));
document.getElementById('align-right').addEventListener('click', () => alignText('right'));
document.getElementById('align-justify').addEventListener('click', () => alignText('justify'));

// Text color
document.getElementById('text-color').addEventListener('input', changeTextColor);

// Element spacing and indent
document.getElementById('element-spacing').addEventListener('input', updateElementSpacing);
document.getElementById('element-indent').addEventListener('input', updateElementIndent);

// Script elements buttons
const elementButtons = document.querySelectorAll('.element-btn');
elementButtons.forEach(button => {
button.addEventListener('click', () => insertElement(button.dataset.element));
});

// Character management
document.getElementById('add-character').addEventListener('click', showCharacterModal);
document.getElementById('save-character').addEventListener('click', saveCharacter);

// Close modals
const closeButtons = document.querySelectorAll('.close-modal');
closeButtons.forEach(button => {
button.addEventListener('click', () => {
document.querySelectorAll('.modal').forEach(modal => {
modal.classList.remove('show');
});
});
});

// Editor events
editor.addEventListener('input', () => {
saveState();
});

editor.addEventListener('keydown', function(e) {
// Save selection for formatting
currentSelection = saveSelection();

// Tab key handling
if (e.key === 'Tab') {
e.preventDefault();
document.execCommand('insertHTML', false, '&nbsp;&nbsp;&nbsp;&nbsp;');
}
});

// Track selection changes
document.addEventListener('selectionchange', function() {
if (document.activeElement === editor) {
currentSelection = saveSelection();
}
});

// Functions

function newScript() {
if (confirm('Create a new script? Any unsaved changes will be lost.')) {
editor.innerHTML = '<div class="act">Act I</div>' +
           '<div class="scene">Scene 1</div>';
scriptTitle.value = 'Untitled Script';
scriptAuthor.value = '';
characters = [];
renderCharactersList();
saveState();
showNotification('New script created');
}
}

function saveScript() {
const scriptData = {
title: scriptTitle.value,
author: scriptAuthor.value,
content: editor.innerHTML,
characters: characters
};

const blob = new Blob([JSON.stringify(scriptData)], {type: 'application/json'});
const filename = (scriptTitle.value || 'untitled').replace(/\s+/g, '_').toLowerCase() + '.theatre';

if (window.navigator.msSaveOrOpenBlob) {
window.navigator.msSaveBlob(blob, filename);
} else {
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = filename;
document.body.appendChild(a);
a.click();
setTimeout(() => {
document.body.removeChild(a);
window.URL.revokeObjectURL(url);
}, 0);
}

showNotification('Script saved successfully');
}

function openScript() {
const input = document.createElement('input');
input.type = 'file';
input.accept = '.theatre,application/json';

input.onchange = e => {
const file = e.target.files[0];
if (!file) return;

const reader = new FileReader();
reader.onload = function(event) {
try {
 const scriptData = JSON.parse(event.target.result);
 scriptTitle.value = scriptData.title || 'Untitled Script';
 scriptAuthor.value = scriptData.author || '';
 editor.innerHTML = scriptData.content || '';
 characters = scriptData.characters || [];
 renderCharactersList();
 saveState();
 showNotification('Script loaded successfully');
} catch (error) {
 alert('Error loading script: ' + error.message);
}
};
reader.readAsText(file);
};

input.click();
}

function exportToPDF() {
showNotification('Preparing PDF...');

const { jsPDF } = window.jspdf;
const doc = new jsPDF({
orientation: document.getElementById('page-orientation').value,
unit: 'mm',
format: document.getElementById('page-size').value
});

// Add title and author
doc.setFontSize(24);
doc.text(scriptTitle.value || 'Untitled Script', doc.internal.pageSize.getWidth() / 2, 20, { align: 'center' });

doc.setFontSize(16);
doc.text('by ' + (scriptAuthor.value || 'Anonymous'), doc.internal.pageSize.getWidth() / 2, 30, { align: 'center' });

// Clone the editor content for PDF generation
const contentClone = editor.cloneNode(true);
const tempContainer = document.createElement('div');
tempContainer.appendChild(contentClone);
document.body.appendChild(tempContainer);

// Style the clone for better PDF rendering
contentClone.style.padding = '20px';
contentClone.style.width = '170mm';
contentClone.style.position = 'absolute';
contentClone.style.left = '-9999px';
contentClone.style.top = '0';
contentClone.style.fontSize = '12pt';

// Use html2canvas to capture the content
html2canvas(contentClone, {
scale: 2,
logging: false,
useCORS: true
}).then(canvas => {
// Remove the temporary container
document.body.removeChild(tempContainer);

const imgData = canvas.toDataURL('image/jpeg', 1.0);

// Calculate the number of pages needed
const imgProps = doc.getImageProperties(imgData);
const pdfWidth = doc.internal.pageSize.getWidth() - 20;
const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

let heightLeft = pdfHeight;
let position = 40; // Start below title and author

// Add first page
doc.addImage(imgData, 'JPEG', 10, position, pdfWidth, pdfHeight);
heightLeft -= (doc.internal.pageSize.getHeight() - 40);

// Add subsequent pages if needed
while (heightLeft > 0) {
position = 10;
doc.addPage();
doc.addImage(imgData, 'JPEG', 10, position - pdfHeight + heightLeft, pdfWidth, pdfHeight);
heightLeft -= (doc.internal.pageSize.getHeight() - 20);
}

// Save the PDF
const filename = (scriptTitle.value || 'untitled').replace(/\s+/g, '_').toLowerCase() + '.pdf';
doc.save(filename);

showNotification('PDF exported successfully');
});
}

function printScript() {
window.print();
}

function formatText(command) {
restoreSelection(currentSelection);
document.execCommand(command, false, null);
saveState();
}

function changeFontSize() {
restoreSelection(currentSelection);
document.execCommand('fontSize', false, this.value);
saveState();
}

function changeFontFamily() {
restoreSelection(currentSelection);
document.execCommand('fontName', false, this.value);
saveState();
}

function alignText(alignment) {
restoreSelection(currentSelection);
document.execCommand('justify' + alignment.charAt(0).toUpperCase() + alignment.slice(1), false, null);
saveState();
}

function changeTextColor() {
restoreSelection(currentSelection);
document.execCommand('foreColor', false, this.value);
saveState();
}

function updateElementSpacing() {
const value = this.value + 'px';
const style = document.createElement('style');
style.textContent = `.editor > div { margin-bottom: ${value}; }`;

// Remove any previous spacing style
const existingStyle = document.getElementById('element-spacing-style');
if (existingStyle) {
existingStyle.remove();
}

style.id = 'element-spacing-style';
document.head.appendChild(style);
}

function updateElementIndent() {
const value = this.value + 'px';
const style = document.createElement('style');
style.textContent = `.dialogue { padding-left: ${value}; padding-right: ${value}; }`;

// Remove any previous indent style
const existingStyle = document.getElementById('element-indent-style');
if (existingStyle) {
existingStyle.remove();
}

style.id = 'element-indent-style';
document.head.appendChild(style);
}

function insertElement(elementType) {
let html = '';

switch(elementType) {
case 'act':
html = '<div class="act">Act</div>';
break;
case 'scene':
html = '<div class="scene">Scene</div>';
break;
case 'character':
html = '<div class="character">CHARACTER</div>';
break;
case 'dialogue':
html = '<div class="dialogue">Dialogue text</div>';
break;
case 'parenthetical':
html = '<div class="parenthetical">(action)</div>';
break;
case 'stage-direction':
html = '<div class="stage-direction">Stage direction</div>';
break;
case 'transition':
html = '<div class="transition">FADE OUT</div>';
break;
case 'note':
html = '<div class="note">Note: This is a note for the production team.</div>';
break;
}

restoreSelection(currentSelection);
document.execCommand('insertHTML', false, html);
saveState();
}

function showCharacterModal() {
document.getElementById('character-name').value = '';
document.getElementById('character-description').value = '';
document.getElementById('character-color').value = '#' + Math.floor(Math.random()*16777215).toString(16);
characterModal.classList.add('show');
}

function saveCharacter() {
const name = document.getElementById('character-name').value.trim();
const description = document.getElementById('character-description').value.trim();
const color = document.getElementById('character-color').value;

if (!name) {
alert('Character name is required');
return;
}

const character = {
id: Date.now().toString(),
name,
description,
color
};

characters.push(character);
renderCharactersList();
characterModal.classList.remove('show');
showNotification(`Character "${name}" added`);
}

function renderCharactersList() {
charactersList.innerHTML = '';

characters.forEach(character => {
const characterItem = document.createElement('div');
characterItem.className = 'character-item';
characterItem.innerHTML = `
<div class="character-color" style="background-color: ${character.color}"></div>
<div class="character-name">${character.name}</div>
<div class="character-actions">
 <button class="edit-character" data-id="${character.id}" title="Edit">
     <i class="fas fa-edit"></i>
 </button>
 <button class="delete-character" data-id="${character.id}" title="Delete">
     <i class="fas fa-trash"></i>
 </button>
</div>
`;

charactersList.appendChild(characterItem);

// Add event listener to insert character name
characterItem.addEventListener('click', function(e) {
if (!e.target.closest('.character-actions')) {
 insertElement('character');
 const characterElements = editor.querySelectorAll('.character');
 const lastCharacter = characterElements[characterElements.length - 1];
 if (lastCharacter) {
     lastCharacter.textContent = character.name;
 }
}
});
});

// Add event listeners for edit and delete buttons
document.querySelectorAll('.edit-character').forEach(button => {
button.addEventListener('click', (e) => {
e.stopPropagation();
editCharacter(button.dataset.id);
});
});

document.querySelectorAll('.delete-character').forEach(button => {
button.addEventListener('click', (e) => {
e.stopPropagation();
deleteCharacter(button.dataset.id);
});
});
}

function editCharacter(id) {
const character = characters.find(c => c.id === id);
if (!character) return;

document.getElementById('character-name').value = character.name;
document.getElementById('character-description').value = character.description;
document.getElementById('character-color').value = character.color;

// Update save button to handle edit
const saveButton = document.getElementById('save-character');
saveButton.textContent = 'Update Character';

        // Store original handler
        const originalHandler = saveButton.onclick;
        
        // Set new handler for update
        saveButton.onclick = function() {
            const name = document.getElementById('character-name').value.trim();
            const description = document.getElementById('character-description').value.trim();
            const color = document.getElementById('character-color').value;
            
            if (!name) {
                alert('Character name is required');
                return;
            }
            
            character.name = name;
            character.description = description;
            character.color = color;
            
            renderCharactersList();
            characterModal.classList.remove('show');
            showNotification(`Character "${name}" updated`);
            
            // Restore original handler
            saveButton.textContent = 'Save Character';
            saveButton.onclick = originalHandler;
        };
        
        characterModal.classList.add('show');
    }
    
    function deleteCharacter(id) {
        const character = characters.find(c => c.id === id);
        if (!character) return;
        
        if (confirm(`Are you sure you want to delete character "${character.name}"?`)) {
            characters = characters.filter(c => c.id !== id);
            renderCharactersList();
            showNotification(`Character "${character.name}" deleted`);
        }
    }
    
    function showNotification(message) {
        notificationMessage.textContent = message;
        notification.classList.add('show');
        
        setTimeout(() => {
            notification.classList.remove('show');
        }, 3000);
    }
    
    // Undo/Redo functionality
    function saveState() {
        undoStack.push({
            content: editor.innerHTML,
            title: scriptTitle.value,
            author: scriptAuthor.value
        });
        
        // Limit stack size
        if (undoStack.length > 50) {
            undoStack.shift();
        }
        
        // Clear redo stack when new changes are made
        redoStack = [];
    }
    
    function undo() {
        if (undoStack.length <= 1) return; // Keep at least one state
        
        // Save current state to redo stack
        redoStack.push(undoStack.pop());
        
        // Restore previous state
        const prevState = undoStack[undoStack.length - 1];
        editor.innerHTML = prevState.content;
        scriptTitle.value = prevState.title;
        scriptAuthor.value = prevState.author;
    }
    
    function redo() {
        if (redoStack.length === 0) return;
        
        // Get state from redo stack
        const nextState = redoStack.pop();
        
        // Save to undo stack
        undoStack.push(nextState);
        
        // Apply state
        editor.innerHTML = nextState.content;
        scriptTitle.value = nextState.title;
        scriptAuthor.value = nextState.author;
    }
    
    // Selection helpers
    function saveSelection() {
        if (window.getSelection) {
            const sel = window.getSelection();
            if (sel.getRangeAt && sel.rangeCount) {
                return sel.getRangeAt(0);
            }
        } else if (document.selection && document.selection.createRange) {
            return document.selection.createRange();
        }
        return null;
    }
    
    function restoreSelection(range) {
        if (range) {
            if (window.getSelection) {
                const sel = window.getSelection();
                sel.removeAllRanges();
                sel.addRange(range);
            } else if (document.selection && range.select) {
                range.select();
            }
        }
    }
    
    // Drag and drop file handling
    document.addEventListener('dragover', function(e) {
        e.preventDefault();
        e.stopPropagation();
        document.body.classList.add('drag-over');
    });
    
    document.addEventListener('dragleave', function(e) {
        e.preventDefault();
        e.stopPropagation();
        document.body.classList.remove('drag-over');
    });
    
    document.addEventListener('drop', function(e) {
        e.preventDefault();
        e.stopPropagation();
        document.body.classList.remove('drag-over');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            const file = files[0];
            if (file.name.endsWith('.theatre') || file.type === 'application/json') {
                const reader = new FileReader();
                reader.onload = function(event) {
                    try {
                        const scriptData = JSON.parse(event.target.result);
                        scriptTitle.value = scriptData.title || 'Untitled Script';
                        scriptAuthor.value = scriptData.author || '';
                        editor.innerHTML = scriptData.content || '';
                        characters = scriptData.characters || [];
                        renderCharactersList();
                        saveState();
                        showNotification('Script loaded successfully');
                    } catch (error) {
                        alert('Error loading script: ' + error.message);
                    }
                };
                reader.readAsText(file);
            } else {
                alert('Please drop a valid theater script file (.theatre or .json)');
            }
        }
    });
    
    // Auto-save functionality
    setInterval(() => {
        const scriptData = {
            title: scriptTitle.value,
            author: scriptAuthor.value,
            content: editor.innerHTML,
            characters: characters,
            lastSaved: new Date().toISOString()
        };
        
        localStorage.setItem('theaterScriptAutoSave', JSON.stringify(scriptData));
    }, 30000); // Auto-save every 30 seconds
    
    // Check for auto-saved data on load
    const autoSavedData = localStorage.getItem('theaterScriptAutoSave');
    if (autoSavedData) {
        try {
            const scriptData = JSON.parse(autoSavedData);
            const lastSaved = new Date(scriptData.lastSaved);
            const now = new Date();
            const hoursSinceLastSave = (now - lastSaved) / (1000 * 60 * 60);
            
            if (hoursSinceLastSave < 24 && confirm('Would you like to restore your last auto-saved script?')) {
                scriptTitle.value = scriptData.title || 'Untitled Script';
                scriptAuthor.value = scriptData.author || '';
                editor.innerHTML = scriptData.content || '';
                characters = scriptData.characters || [];
                renderCharactersList();
                saveState();
                showNotification('Auto-saved script restored');
            }
        } catch (error) {
            console.error('Error loading auto-saved script:', error);
        }
    }
    
    // Keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        // Ctrl/Cmd + S to save
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            saveScript();
        }
        
        // Ctrl/Cmd + Z to undo
        if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
            e.preventDefault();
            undo();
        }
        
        // Ctrl/Cmd + Shift + Z or Ctrl/Cmd + Y to redo
        if (((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z') || 
            ((e.ctrlKey || e.metaKey) && e.key === 'y')) {
            e.preventDefault();
            redo();
        }
        
        // Ctrl/Cmd + P to print
        if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
            e.preventDefault();
            printScript();
        }
    });
    
    // Character counter
    editor.addEventListener('input', updateCharacterCount);
    
    function updateCharacterCount() {
        const text = editor.textContent || '';
        const wordCount = text.split(/\s+/).filter(word => word.length > 0).length;
        const charCount = text.length;
        
        // Create or update the counter element
        let counter = document.getElementById('character-counter');
        if (!counter) {
            counter = document.createElement('div');
            counter.id = 'character-counter';
            counter.className = 'character-counter';
            document.querySelector('.editor-container').appendChild(counter);
        }
        
        counter.textContent = `${wordCount} words, ${charCount} characters`;
    }
    
    // Initialize character counter
    updateCharacterCount();
    
    // Add CSS for character counter
    const counterStyle = document.createElement('style');
    counterStyle.textContent = `
        .character-counter {
            position: absolute;
            bottom: 10px;
            right: 10px;
            background-color: rgba(0, 0, 0, 0.1);
            padding: 5px 10px;
            border-radius: 4px;
            font-size: 12px;
            color: #666;
        }
    `;
    document.head.appendChild(counterStyle);
    
    // Add fullscreen functionality
    const fullscreenStyle = document.createElement('style');
    fullscreenStyle.textContent = `
        .fullscreen-editor {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: #fff;
            z-index: 1000;
            padding: 2rem;
            overflow: auto;
        }
        
        .fullscreen-toggle {
            position: fixed;
            bottom: 20px;
            right: 20px;
            background-color: var(--primary-color);
            color: white;
            width: 40px;
            height: 40px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
            z-index: 1001;
            border: none;
        }
    `;
    document.head.appendChild(fullscreenStyle);
    
    // Create fullscreen toggle button
    const fullscreenToggle = document.createElement('button');
    fullscreenToggle.className = 'fullscreen-toggle';
    fullscreenToggle.innerHTML = '<i class="fas fa-expand"></i>';
    document.body.appendChild(fullscreenToggle);
    
    let isFullscreen = false;
    
    fullscreenToggle.addEventListener('click', function() {
        isFullscreen = !isFullscreen;
        
        if (isFullscreen) {
            editor.classList.add('fullscreen-editor');
            fullscreenToggle.innerHTML = '<i class="fas fa-compress"></i>';
        } else {
            editor.classList.remove('fullscreen-editor');
            fullscreenToggle.innerHTML = '<i class="fas fa-expand"></i>';
        }
    });
    
    // Add search functionality
    const searchStyle = document.createElement('style');
    searchStyle.textContent = `
        .search-container {
            position: absolute;
            top: 10px;
            right: 10px;
            display: flex;
            gap: 5px;
            z-index: 100;
            background-color: white;
            padding: 5px;
            border-radius: 4px;
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
            display: none;
        }
        
        .search-container.show {
            display: flex;
        }
        
        .search-container input {
            padding: 5px;
            border: 1px solid #ddd;
            border-radius: 4px;
        }
        
        .search-container button {
            background-color: var(--primary-color);
            color: white;
            border: none;
            border-radius: 4px;
            padding: 5px 10px;
            cursor: pointer;
        }
        
        .search-highlight {
            background-color: yellow;
        }
    `;
    document.head.appendChild(searchStyle);
    
    // Create search container
    const searchContainer = document.createElement('div');
    searchContainer.className = 'search-container';
    searchContainer.innerHTML = `
        <input type="text" id="search-input" placeholder="Search...">
        <button id="search-prev"><i class="fas fa-arrow-up"></i></button>
        <button id="search-next"><i class="fas fa-arrow-down"></i></button>
        <button id="close-search"><i class="fas fa-times"></i></button>
    `;
    document.querySelector('.editor-container').appendChild(searchContainer);
    
    // Add keyboard shortcut for search
    document.addEventListener('keydown', function(e) {
        if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
            e.preventDefault();
            searchContainer.classList.add('show');
            document.getElementById('search-input').focus();
        }
        
        if (e.key === 'Escape') {
            searchContainer.classList.remove('show');
        }
    });
    
    document.getElementById('close-search').addEventListener('click', function() {
        searchContainer.classList.remove('show');
    });
    
    // Initialize the editor
    updateElementSpacing.call({ value: 10 });
    updateElementIndent.call({ value: 0 });
    
    // Show welcome message
    showNotification('Welcome to Theater Script Editor!');
});

// Add this to the event listeners section at the beginning of the script
document.getElementById('add-stage-direction').addEventListener('click', addStageDirection);

// Add this function to the JavaScript file
function addStageDirection() {
    // Create a modal for stage direction input
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.classList.add('show');
    
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>Add Stage Direction</h2>
                <button class="close-modal">&times;</button>
            </div>
            <div class="modal-body">
                <div class="form-group">
                    <label for="stage-direction-text">Stage Direction:</label>
                    <textarea id="stage-direction-text" placeholder="Enter stage direction (e.g., 'Character enters from stage left')" rows="4"></textarea>
                </div>
                <div class="form-group">
                    <label>Style:</label>
                    <div class="button-group">
                        <button id="style-normal" class="btn-small active" title="Normal">
                            <i class="fas fa-font"></i>
                        </button>
                        <button id="style-emphasized" class="btn-small" title="Emphasized">
                            <i class="fas fa-exclamation"></i>
                        </button>
                        <button id="style-parenthetical" class="btn-small" title="Parenthetical">
                            <i class="fas fa-brackets-curly"></i>
                        </button>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button id="insert-stage-direction" class="btn primary">Insert</button>
                <button class="btn cancel close-modal">Cancel</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Focus the textarea
    setTimeout(() => {
        document.getElementById('stage-direction-text').focus();
    }, 100);
    
    // Style selection
    let selectedStyle = 'normal';
    
    document.getElementById('style-normal').addEventListener('click', function() {
        selectedStyle = 'normal';
        updateStyleButtons(this);
    });
    
    document.getElementById('style-emphasized').addEventListener('click', function() {
        selectedStyle = 'emphasized';
        updateStyleButtons(this);
    });
    
    document.getElementById('style-parenthetical').addEventListener('click', function() {
        selectedStyle = 'parenthetical';
        updateStyleButtons(this);
    });
    
    function updateStyleButtons(activeButton) {
        document.querySelectorAll('.button-group .btn-small').forEach(btn => {
            btn.classList.remove('active');
        });
        activeButton.classList.add('active');
    }
    
    // Close modal handlers
    const closeButtons = modal.querySelectorAll('.close-modal');
    closeButtons.forEach(button => {
        button.addEventListener('click', () => {
            modal.remove();
        });
    });
    
    // Insert stage direction
    document.getElementById('insert-stage-direction').addEventListener('click', () => {
        const text = document.getElementById('stage-direction-text').value.trim();
        
        if (!text) {
            alert('Please enter stage direction text');
            return;
        }
        
        let html = '';
        
        switch(selectedStyle) {
            case 'normal':
                html = `<div class="stage-direction">${text}</div>`;
                break;
            case 'emphasized':
                html = `<div class="stage-direction emphasized">${text}</div>`;
                break;
            case 'parenthetical':
                html = `<div class="parenthetical">(${text})</div>`;
                break;
        }
        
        restoreSelection(currentSelection);
        document.execCommand('insertHTML', false, html);
        saveState();
        
        modal.remove();
        showNotification('Stage direction added');
    });
    
    // Add keyboard shortcut for Enter key
    document.getElementById('stage-direction-text').addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            document.getElementById('insert-stage-direction').click();
        }
    });
}