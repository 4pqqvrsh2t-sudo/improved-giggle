<script>
/* ======================================================
   Federation Wiki JS - Fixed for Syntax / IDs Only
   ====================================================== */

/* ======================================================
   1. Global Variables and State
   ====================================================== */
let PAGES = [];                   // Stores all pages, tabs, and sections
let currentPageId = null;         // Tracks current page
let editorState = null;           // Tracks editor modal state
let codeMode = false;             // Tracks if editor is in code mode

/* ======================================================
   2. Utility Functions
   ====================================================== */
// Simple selector shortcuts
function $(selector, parent=document){ return parent.querySelector(selector); }
function $$(selector, parent=document){ return Array.from(parent.querySelectorAll(selector)); }

// Generate unique ID for pages/tabs/sections
function makeId(prefix='id'){ return prefix + '_' + Date.now() + '_' + Math.floor(Math.random()*1000); }

// Save/load pages to localStorage
function savePagesToStorage(pages){ localStorage.setItem('FED_PAGES', JSON.stringify(pages)); }
function loadPagesFromStorage(){ return JSON.parse(localStorage.getItem('FED_PAGES') || '[]'); }

/* ======================================================
   3. Page and Tab Utilities
   ====================================================== */
function getPageById(pid){ return PAGES.find(p=>p.id===pid) || null; }
function getTabById(page, tid){ return page.tabs.find(t=>t.id===tid) || null; }
function getSectionById(tab, sid){ return tab.sections.find(s=>s.id===sid) || null; }

/* ======================================================
   4. Load / Display Pages
   ====================================================== */
function loadPage(pid){
  const page = getPageById(pid);
  if(!page) return;
  currentPageId = pid;
  const contentEl = $('#content');
  contentEl.innerHTML = '';
  
  page.tabs.forEach(tab=>{
    const tabEl = document.createElement('div');
    tabEl.classList.add('tab-container');
    tabEl.innerHTML = `<h2>${tab.title}</h2>`;
    
    tab.sections.forEach(section=>{
      const sectionEl = document.createElement('div');
      sectionEl.classList.add('section-container');
      // Escape backticks in content to avoid syntax errors
      const safeContent = (section.content || '').replace(/`/g,'\\`');
      sectionEl.innerHTML = `
        <div class="collapse-header">
          <span>${section.header}</span>
          <button class="edit-btn" data-edit-page="${page.id}" data-edit-tab="${tab.id}" data-edit-section="${section.id}">Edit</button>
        </div>
        <div class="collapse-content" style="display:${section.collapsed?'none':'block'}">
          ${safeContent}
        </div>`;
      tabEl.appendChild(sectionEl);
    });
    contentEl.appendChild(tabEl);
  });

  attachInlineEditButtons();
  attachCollapseBehavior();
}

/* ======================================================
   5. Editor Modal Elements (IDs fixed to match HTML)
   ====================================================== */
const editorModal = $('#editorModal');           // HTML has id="editorModal"
const editorTitle = $('#editorTitle');           // HTML has id="editorTitle"
const editorContent = $('#editorContent');       // HTML has id="editorContent"
const codeArea = $('#codeArea');                 // HTML has id="codeArea"
const editorSaveBtn = $('#editorSaveBtn');       // HTML has id="editorSaveBtn"
const editorSaveAndCloseBtn = $('#editorSaveAndCloseBtn'); // HTML has id="editorSaveAndCloseBtn"
const editorCloseBtn = $('#editorCloseBtn');     // HTML has id="editorCloseBtn"
const editorCloseNoSaveBtn = $('#editorCloseNoSaveBtn'); // HTML has id="editorCloseNoSaveBtn"
const editorRevertBtn = $('#editorRevertBtn');   // HTML has id="editorRevertBtn"
const codeModeBtn = $('#codeModeBtn');           // HTML has id="codeModeBtn"
const addTabBtn = $('#addTabBtn');               // HTML has id="addTabBtn"
const newTabTitleInput = $('#newTabTitle');      // HTML has id="newTabTitle"

/* ======================================================
   6. Editor Modal Functions
   ====================================================== */
function openEditorForSection(pageId, tabId, sectionId){
  const page = getPageById(pageId);
  if(!page) return;
  const tab = getTabById(page, tabId);
  if(!tab) return;
  const section = getSectionById(tab, sectionId);
  if(!section) return;

  editorState = { pageId, tabId, sectionId, originalContent: section.content };

  editorTitle.textContent = `Editing: ${page.title} / ${tab.title} / ${section.header}`;
  codeMode = false;
  editorContent.style.display = '';
  codeArea.style.display = 'none';
  editorContent.value = section.content || '';
  editorModal.style.display = 'flex';
}

function saveEditorChanges(close=false){
  if(!editorState) return;
  const { pageId, tabId, sectionId } = editorState;
  const page = getPageById(pageId);
  const tab = getTabById(page, tabId);
  const section = getSectionById(tab, sectionId);
  if(!section) return;

  const newContent = codeMode ? codeArea.value : editorContent.value;
  section.content = newContent;
  savePagesToStorage(PAGES);
  loadPage(currentPageId);

  if(close) editorModal.style.display = 'none';
}

function revertEditorChanges(){
  if(!editorState) return;
  editorContent.value = editorState.originalContent;
  codeArea.value = editorState.originalContent;
}

function closeEditorWithoutSave(){
  editorModal.style.display = 'none';
  editorState = null;
}

function toggleCodeMode(){
  codeMode = !codeMode;
  if(codeMode){
    codeArea.style.display = '';
    editorContent.style.display = 'none';
    codeArea.value = editorContent.value;
    codeModeBtn.textContent = 'Visual Mode';
  } else {
    codeArea.style.display = 'none';
    editorContent.style.display = '';
    editorContent.value = codeArea.value;
    codeModeBtn.textContent = 'Code Mode';
  }
}

/* ======================================================
   7. Add New Tab / Section
   ====================================================== */
function addNewTabToPage(pageId, title){
  const page = getPageById(pageId);
  if(!page) return;
  const newTab = { id: makeId('t'), title: title||'New Tab', sections: [] };
  page.tabs.push(newTab);
  savePagesToStorage(PAGES);
  loadPage(currentPageId);
}

function addNewSectionToTab(pageId, tabId, header){
  const page = getPageById(pageId);
  const tab = getTabById(page, tabId);
  if(!tab) return;
  const newSection = { id: makeId('s'), header: header||'New Section', content:'', collapsed:false };
  tab.sections.push(newSection);
  savePagesToStorage(PAGES);
  loadPage(currentPageId);
}

/* ======================================================
   8. Inline Edit Buttons
   ====================================================== */
function attachInlineEditButtons(){
  $$('button.edit-btn').forEach(b=>{
    b.addEventListener('click', (e)=>{
      e.stopPropagation();
      const pid = b.dataset.editPage, tid = b.dataset.editTab, sid = b.dataset.editSection;
      openEditorForSection(pid, tid, sid);
    });
  });
}

/* ======================================================
   9. Collapse / Expand Sections
   ====================================================== */
function attachCollapseBehavior(){
  $$('.collapse-header').forEach(h=>{
    h.addEventListener('click', (ev)=>{
      if(ev.target.closest('button')) return;
      const content = h.parentElement.querySelector('.collapse-content');
      if(!content) return;
      content.style.display = (content.style.display === 'none') ? 'block' : 'none';
    });
  });
}

/* ======================================================
   10. Event Listeners
   ====================================================== */
if(editorSaveBtn) editorSaveBtn.addEventListener('click', ()=>saveEditorChanges(false));
if(editorSaveAndCloseBtn) editorSaveAndCloseBtn.addEventListener('click', ()=>saveEditorChanges(true));
if(editorCloseBtn) editorCloseBtn.addEventListener('click', closeEditorWithoutSave);
if(editorCloseNoSaveBtn) editorCloseNoSaveBtn.addEventListener('click', closeEditorWithoutSave);
if(editorRevertBtn) editorRevertBtn.addEventListener('click', revertEditorChanges);
if(codeModeBtn) codeModeBtn.addEventListener('click', toggleCodeMode);
if(addTabBtn) addTabBtn.addEventListener('click', ()=>{
  const title = newTabTitleInput.value.trim() || 'New Tab';
  addNewTabToPage(currentPageId, title);
  newTabTitleInput.value = '';
});

/* ======================================================
   11. Initial Load
   ====================================================== */
PAGES = loadPagesFromStorage();
if(PAGES.length>0) loadPage(PAGES[0].id);
</script>
