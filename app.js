/**
 * EluConnect - Plateforme Élus & Techniciens
 * Version Finale de Démonstration (Architecture & Navigation)
 */

// --- CONFIG ---
const ROLES = { ADMIN: 'admin', MAIRE: 'maire', ADJOINT: 'adjoint', TECHNICIEN: 'technicien', ELU: 'elu' };
const MONTH_NAMES = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sept", "Oct", "Nov", "Déc"];
const APP_DATE = new Date("2026-03-23"); // Date de référence aujourd'hui

// --- MOCK DATA ---
let state = {
  user: null, 
  currentView: 'login',
  activeThemeId: null,
  activeSubjectId: null,
  activeDocId: null, // Pour la visionneuse
  
  themes: [
    { id: 1, title: 'Enfance & Jeunesse', desc: 'Gestion des crèches, centres de loisirs et écoles.', referentId: 3, isArchived: false, docs: [{ id: 10, title: "Délibérations_2024.txt", content: "..." }] },
    { id: 2, title: 'Urbanisme & Travaux', desc: 'Aménagements, voirie, PLU.', referentId: 4, isArchived: false, docs: [] },
    { id: 3, title: 'Finance & RH', desc: 'Gestion interne et budgétaire.', referentId: 2, isArchived: false, docs: [{ id: 30, title: "Politique_RH.txt", content: "Données RH..." }] }
  ],
  
  subjects: [
    { id: 101, themeId: 1, title: 'Tarif Cantine 2026', desc: 'Révision des tarifs.', isPublic: true, isConfidential: false, councilDate: null, docs: [{ id: 11, title: "Tarifs_ALSH.txt", content: "Détails..." }] },
    { id: 102, themeId: 1, title: 'Rénovation École Jaurès', desc: 'Travaux de maintenance.', isPublic: false, isConfidential: false, docs: [] },
    { id: 301, themeId: 3, title: 'Gestion de la Prime annuelle', desc: 'Confidentiel RH.', isPublic: false, isConfidential: true, docs: [{ id: 31, title: "Analyse_RH.txt", content: "..." }] }
  ],

  councils: [
    { id: 1, date: '2026-04-12T20:00', agenda: [] },
    { id: 2, date: '2026-05-15T18:30', agenda: [] }
  ],

  messages: [], 
  ragSelectedDocs: [], 
  gantt: {
    101: [
      { task: "Consultation parents", start: "2026-01-10", end: "2026-02-15", status: "done" },
      { task: "Calcul financier", start: "2026-02-20", end: "2026-03-15", status: "done" },
      { task: "Rédaction", start: "2026-03-20", end: "2026-04-10", status: "active" }
    ]
  },

  users: [
    { id: 1, name: 'Adeline Admin', role: ROLES.ADMIN },
    { id: 2, name: 'M. le Maire', role: ROLES.MAIRE },
    { id: 3, name: 'Adjointe Enfance', role: ROLES.ADJOINT },
    { id: 4, name: 'Technicien Urb', role: ROLES.TECHNICIEN }
  ]
};

// --- PERMISSIONS LOGIC ---
const Permissions = {
  isPublic: () => !state.user,
  canSeeSubject: (s, u) => {
    if (!u) return s.isPublic;
    if (u.role === ROLES.ADMIN || u.role === ROLES.MAIRE) return true;
    if (u.role === ROLES.TECHNICIEN && s.isConfidential) return false;
    return true;
  },
  canManageCouncil: (u) => u && [ROLES.ADMIN, ROLES.MAIRE, ROLES.TECHNICIEN].includes(u.role),
  canAddToAgenda: (u) => u && [ROLES.ADMIN, ROLES.MAIRE, ROLES.ADJOINT].includes(u.role),
  canEditSubject: (s, u) => {
    if (!u) return false;
    if ([ROLES.ADMIN, ROLES.MAIRE].includes(u.role)) return true;
    const theme = state.themes.find(t => t.id === s.themeId);
    return theme && theme.referentId === u.id;
  }
};

// --- RENDER ENGINE ---
function render() {
  const app = document.getElementById('app');
  if (state.currentView === 'login') app.innerHTML = renderLogin();
  else app.innerHTML = renderAppLayout(getContentForView());
  attachEvents();
}

function getContentForView() {
  switch(state.currentView) {
    case 'dashboard': return renderDashboard();
    case 'theme': return renderThemeView();
    case 'subject': return renderSubjectView();
    case 'rag': return renderRAGView();
    case 'council': return renderCouncilManagement();
    default: return `<h2>Vue manquante</h2><button onclick="navigate('dashboard')">Retour</button>`;
  }
}

// --- VIEW TEMPLATES ---
function renderLogin() {
  return `<div class="auth-wrapper"><div class="auth-card"><div style="font-size: 3rem; color: var(--primary); margin-bottom: 1rem;"><span class="material-icons-round" style="font-size: inherit;">account_balance</span></div><h2>EluConnect</h2><p style="color:var(--text-muted); margin-bottom: 2rem;">Sélectionnez votre profil d'accès</p><div style="display: flex; flex-direction: column; gap: 0.8rem;">${state.users.map(u => `<button class="btn btn-primary" onclick="loginAs(${u.id})" style="justify-content: space-between; padding: 1.2rem; width: 100%;"><span>${u.name}</span><span class="role-badge role-${u.role}">${u.role}</span></button>`).join('')}<hr style="border:0; border-top:1px solid #ddd; margin:0.5rem 0"><button class="btn btn-outline" onclick="loginPublic()" style="background:#f1f5f9; color:#475569; padding:1.2rem; justify-content:center; width:100%">Espace Population (Visiteur)</button></div></div></div>`;
}

function renderAppLayout(content) {
  const isP = Permissions.isPublic();
  const u = state.user || { name: 'Citoyen', role: ROLES.ELU };
  return `
    <header class="glass-header">
      <div class="brand" onclick="navigate('dashboard')" style="cursor:pointer"><span class="material-icons-round">account_balance</span> EluConnect</div>
      <div style="display:flex; align-items:center; gap:0.5rem">
        ${!isP ? `<button class="btn btn-icon" onclick="navigate('rag')" title="IA"><span class="material-icons-round">psychology</span></button>` : ''}
        <button class="btn btn-icon" onclick="navigate('council')" title="Conseils"><span class="material-icons-round">calendar_month</span></button>
        <div style="text-align:right; margin-right:5px"><div style="font-size:0.75rem; font-weight:800">${u.name}</div><div class="role-badge role-${u.role}" style="margin:0; padding:0 0.3rem">${u.role}</div></div>
        <button class="btn btn-icon" onclick="logout()" title="Déconnexion"><span class="material-icons-round">logout</span></button>
      </div>
    </header>
    <main class="main-content">${content}</main>
    ${state.activeDocId ? renderDocViewer() : ''}
  `;
}

function renderDashboard() {
  const isP = Permissions.isPublic();
  return `<div class="view-header" style="display:flex; justify-content:space-between; align-items:center"><div><h2>${isP ? 'Dossiers Publics' : 'Projets & Commissions'}</h2><p style="color:var(--text-muted)">Bienvenue sur l'outil de gestion communale.</p></div>${Permissions.canManageCouncil(state.user) ? `<div style="display:flex; align-items:center; gap:0.5rem"><input type="datetime-local" id="new-council-dt" style="padding:0.55rem; border:1px solid #ddd; border-radius:8px; font-size:0.8rem"><button class="btn btn-primary" onclick="addCouncilDate()"><span class="material-icons-round">event</span> Fixer Conseil</button></div>`:'' } </div><div class="card-grid">${state.themes.filter(t => !t.isArchived).map(t => { const subs = state.subjects.filter(s => s.themeId === t.id && Permissions.canSeeSubject(s, state.user)); if (isP && subs.length === 0) return ''; return `<div class="card" onclick="openTheme(${t.id})"><h3>${t.title}</h3><p class="card-desc">${t.desc}</p><div style="font-size:0.75rem; color:var(--text-muted); margin-top:1rem">${subs.length} dossier(s)</div></div>`; }).join('')}</div>`;
}

function renderThemeView() {
  const t = state.themes.find(x => x.id === state.activeThemeId);
  const subs = state.subjects.filter(s => s.themeId === t.id && Permissions.canSeeSubject(s, state.user));
  const msgList = state.messages.filter(m => m.type === 'theme' && m.targetId === t.id);
  const isP = Permissions.isPublic();
  return `<div class="view-header"><div style="display:flex; align-items:center; gap:1rem"><button class="btn btn-icon" onclick="navigate('dashboard')"><span class="material-icons-round">arrow_back</span></button><h2>${t.title}</h2></div></div><div style="display:grid; grid-template-columns: 1fr ${isP ? '' : '350px'}; gap:2rem"><div><h3>Sujets</h3><div class="card-grid" style="grid-template-columns:1fr">${subs.map(s => `<div class="card" onclick="openSubject(${s.id})" style="padding:1rem; display:flex; justify-content:space-between; align-items:center"><div><h4 style="margin:0">${s.title} ${s.isConfidential ? '🔒' : ''}</h4><p class="card-desc" style="margin:0">${s.desc}</p></div><span class="material-icons-round">chevron_right</span></div>`).join('')}</div></div>${!isP ? `<div style="background:white; border:1px solid #ddd; border-radius:12px; height: 500px; display:flex; flex-direction:column"><h3 style="padding:1rem; font-size:1rem; border-bottom:1px solid #eee">Forum Thématique</h3><div id="thread" style="flex:1; overflow-y:auto; padding:1rem; font-size:0.85rem; display:flex; flex-direction:column; gap:0.55rem">${msgList.map(m => `<div><b style="color:var(--primary)">${m.sender}</b>: ${m.text}</div>`).join('') || '<p style="color:#aaa; text-align:center">Aucun message.</p>'}</div><div style="padding:0.75rem; border-top:1px solid #eee; display:flex; gap:0.5rem"><input id="tmsg" style="flex:1; border:1px solid #ddd; border-radius:8px; padding:0.6rem" placeholder="Message..."><button class="btn btn-primary" onclick="sendPrompt('theme', ${t.id}, 'tmsg')">S</button></div></div>` : ''}</div>`;
}

function renderSubjectView() {
  const s = state.subjects.find(x => x.id === state.activeSubjectId);
  const isP = Permissions.isPublic();
  const subMsgs = state.messages.filter(m => m.type === 'subject' && m.targetId === s.id);
  const ganttItems = state.gantt[s.id] || [];
  const canEdit = Permissions.canEditSubject(s, state.user);

  return `
    <div class="view-header" style="display:flex; justify-content:space-between; align-items:center">
      <div style="display:flex; align-items:center; gap:1rem"><button class="btn btn-icon" onclick="openTheme(${s.themeId})"><span class="material-icons-round">arrow_back</span></button><div><h2>${s.title}</h2>${s.councilDate ? `<span class="tag-public">Conseil: ${new Date(s.councilDate).toLocaleString('fr-FR')}</span>` : ''}</div></div>
      ${Permissions.canAddToAgenda(state.user) && !s.councilDate ? `<button class="btn btn-primary" onclick="addToCouncil(${s.id})"><span class="material-icons-round">add_to_photos</span> Inscrire au Conseil</button>` : ''}
    </div>
    <div style="display:grid; grid-template-columns: 1fr ${isP ? '' : '350px'}; gap:2rem">
      <div style="display:flex; flex-direction:column; gap:2rem">
        <!-- DOCUMENTS -->
        <div style="background:white; border:1px solid #eee; padding:1.5rem; border-radius:12px">
           <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem"><h3>Documents du dossier</h3>
           ${canEdit ? `<label class="btn btn-primary btn-sm" style="cursor:pointer"><input type="file" style="display:none" onchange="handleFileUpload(event, ${s.id})" multiple><span class="material-icons-round">upload</span> Ajouter</label>` : ''}</div>
           <div style="display:flex; flex-wrap:wrap; gap:1rem">
              ${s.docs.map(d => `<div class="card" onclick="openDoc(${d.id})" style="flex:1; min-width:150px; padding:0.8rem; border:1px solid #eee; display:flex; gap:0.5rem; align-items:center"><span class="material-icons-round" style="color:#ef4444">description</span> <div style="font-size:0.8rem; overflow:hidden; text-overflow:ellipsis; white-space:nowrap">${d.title}</div></div>`).join('')}
              ${s.docs.length === 0 ? '<p style="color:#999; font-size:0.85rem">Aucun document.</p>' : ''}
           </div>
        </div>
        <!-- TIMELINE -->
        <div class="gantt-wrapper">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem"><h3>Calendrier Projet</h3> ${canEdit ? `<button class="btn btn-outline btn-sm" onclick="addGanttStep(${s.id})">Ajouter Étape</button>` : ''}</div>
          <div class="gantt-header">${MONTH_NAMES.map(m => `<div class="gantt-month">${m}</div>`).join('')}</div>
          <div class="gantt-body"><div class="gantt-today-line" style="left:${getGanttPos(APP_DATE)}%"></div>${ganttItems.map(g => renderGanttRow(g)).join('')}</div>
        </div>
      </div>
      ${!isP ? `
        <div style="background:white; border:1px solid #ddd; border-radius:12px; height: 100%; min-height:500px; display:flex; flex-direction:column">
           <h3 style="padding:1rem; font-size:1rem; border-bottom:1px solid #eee">Forum Privé</h3>
           <div style="flex:1; overflow-y:auto; padding:1rem; font-size:0.85rem; display:flex; flex-direction:column; gap:0.55rem">${subMsgs.map(m => `<div><b style="color:var(--primary)">${m.sender}</b>: ${m.text}</div>`).join('') || '<p style="color:#aaa; text-align:center">Début du dossier.</p>'}</div>
           <div style="padding:0.75rem; border-top:1px solid #eee; display:flex; gap:0.5rem"><input id="smsg" style="flex:1; border:1px solid #ddd; border-radius:8px; padding:0.6rem" placeholder="Message..."><button class="btn btn-primary" onclick="sendPrompt('subject', ${s.id}, 'smsg')">S</button></div>
        </div>
      ` : ''}
    </div>
  `;
}

function renderDocViewer() {
  const d = [...state.themes, ...state.subjects].flatMap(x => x.docs || []).find(x => x.id === state.activeDocId);
  return `<div style="position:fixed; inset:0; background:rgba(0,0,0,0.8); z-index:2000; display:flex; align-items:center; justify-content:center; padding:2rem"><div style="background:white; width:100%; max-width:800px; height:80vh; border-radius:12px; display:flex; flex-direction:column"><div style="display:flex; justify-content:space-between; padding:1.5rem; border-bottom:1px solid #eee"><h3>${d.title}</h3><button class="btn btn-icon" onclick="closeDoc()"><span class="material-icons-round">close</span></button></div><div style="flex:1; padding:2rem; overflow-y:auto; line-height:1.6; color:#334155; white-space:pre-wrap">${d.content}</div><div style="padding:1rem; border-top:1px solid #eee; text-align:right"><button class="btn btn-outline" onclick="closeDoc()">Fermer</button></div></div></div>`;
}

function renderRAGView() {
  return `<div class="view-header"><h2>IA Thématique</h2><p>Analyse pseudonymisée des dossiers.</p></div><div style="display:grid; grid-template-columns: 350px 1fr; gap:2rem; height: calc(100vh - 200px)"><div class="rag-sidebar" style="border-radius:12px; border:1px solid #ddd">${state.themes.map(t => `<div style="margin-bottom:1rem"><b style="color:var(--primary)">${t.title}</b>${t.docs.map(d => `<div class="rag-doc-item" onclick="toggleRagDoc(${d.id})"><input type="checkbox" ${state.ragSelectedDocs.includes(d.id)?'checked':''}> <span class="material-icons-round" style="font-size:1rem">description</span> ${d.title}</div>`).join('')}${state.subjects.filter(s => s.themeId === t.id).map(s => `<div style="margin-left:1.5rem; margin-top:0.3rem"><i>${s.title}</i>${s.docs.map(sd => `<div class="rag-doc-item" onclick="toggleRagDoc(${sd.id})"><input type="checkbox" ${state.ragSelectedDocs.includes(sd.id)?'checked':''}> <span class="material-icons-round" style="font-size:1rem">description</span> ${sd.title}</div>`).join('')}</div>`).join('')}</div>`).join('')}</div><div style="display:flex; flex-direction:column; gap:1rem"><div id="rag-chat" style="flex:1; background:#f8fafc; border:1px solid #ddd; border-radius:12px; padding:1.5rem; overflow-y:auto"><div style="text-align:center; color:#999; margin-top:2rem">L'IA analysera les <b>${state.ragSelectedDocs.length} documents</b> sélectionnés.</div></div><div style="display:flex; gap:1rem"><input id="rag-input" style="flex:1; padding:1rem; border-radius:12px; border:1px solid #ddd" placeholder="Question sur les dossiers..."><button class="btn btn-primary" onclick="alert('Analyse en cours...')">Lancer</button></div></div></div>`;
}

function renderCouncilManagement() {
  return `<div class="view-header"><h2>Calendrier des Conseils</h2></div><div class="council-list">${state.councils.map(c => { const dt = new Date(c.date); const days = Math.round((dt - APP_DATE) / (1000*60*60*24)); return `<div class="council-card" onclick="alert('Agenda: '+ (c.agenda.length||0) +' dossiers.')"><div><b>Conseil du ${dt.toLocaleDateString('fr-FR', {day:'numeric', month:'long'})} à ${dt.toLocaleTimeString('fr-FR', {hour:'2-digit', minute:'2-digit'})}</b> <span style="font-size:0.7rem; color:${days < 15 ? (days < 0 ? '#999' : 'red') : 'green'}">${days < 0 ? '(Passé)' : 'dans '+days+'j'}</span></div><span class="material-icons-round">chevron_right</span></div>`; }).join('')}</div>`;
}

// --- UTILS ---
window.loginAs = (id) => { state.user = state.users.find(u => u.id === id); state.currentView = 'dashboard'; render(); };
window.loginPublic = () => { state.user = null; state.currentView = 'dashboard'; render(); };
window.logout = () => { state.user = null; state.currentView = 'login'; render(); };
window.navigate = (view) => { state.currentView = view; render(); };
window.openTheme = (id) => { state.activeThemeId = id; state.currentView = 'theme'; render(); };
window.openSubject = (id) => { state.activeSubjectId = id; state.currentView = 'subject'; render(); };
window.openDoc = (id) => { state.activeDocId = id; render(); };
window.closeDoc = () => { state.activeDocId = null; render(); };

window.addCouncilDate = () => { const dt = document.getElementById('new-council-dt').value; if (dt) { state.councils.push({ id: Date.now(), date: dt, agenda: [] }); render(); } };

window.addToCouncil = (sid) => {
  const nextC = state.councils.find(c => (new Date(c.date) - APP_DATE) / (1000*60*60*24) >= 15);
  if (!nextC) return alert("Aucun conseil valide (délai 15j).");
  if (confirm(`Ajouter au conseil du ${nextC.date} ?`)) { state.subjects.find(s => s.id === sid).councilDate = nextC.date; nextC.agenda.push(sid); render(); }
};

window.handleFileUpload = (e, sid) => {
  const files = e.target.files;
  for (let f of files) {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const s = state.subjects.find(x => x.id === sid);
      const newDoc = { id: Date.now() + Math.random(), title: f.name, content: ev.target.result || "Contenu extrait via OCR..." };
      s.docs.push(newDoc);
      render();
    };
    reader.readAsText(f);
  }
};

window.addGanttStep = (sid) => {
  const task = prompt("Nom de l'étape :");
  if (task) {
    const start = prompt("Date début (AAAA-MM-JJ) :", "2026-04-01");
    const end = prompt("Date fin (AAAA-MM-JJ) :", "2026-04-15");
    if (!state.gantt[sid]) state.gantt[sid] = [];
    state.gantt[sid].push({ task, start, end, status: 'todo' });
    render();
  }
};

window.sendPrompt = (type, targetId, inputId) => {
  const text = document.getElementById(inputId).value;
  if (!text) return;
  state.messages.push({ type, targetId, sender: state.user.name, text, date: new Date().toISOString() });
  render();
};

window.toggleRagDoc = (id) => { const idx = state.ragSelectedDocs.indexOf(id); if (idx > -1) state.ragSelectedDocs.splice(idx, 1); else state.ragSelectedDocs.push(id); render(); };

function getGanttPos(d) { const date = new Date(d); const s = new Date("2026-01-01"); return Math.max(0, Math.min(100, ((date - s) / (new Date("2026-12-31") - s)) * 100)); }
function renderGanttRow(g) {
  if (g.type === 'milestone') { const p = getGanttPos(g.date); return `<div class="gantt-row"><div class="gantt-label">${g.task}</div><div class="gantt-bar-wrap"><div class="gantt-milestone" style="left: calc(${p}% - 6px)"></div></div></div>`; }
  const l = getGanttPos(g.start), r = getGanttPos(g.end);
  return `<div class="gantt-row"><div class="gantt-label">${g.task}</div><div class="gantt-bar-wrap"><div class="gantt-bar" style="left:${l}%; width:${r-l}%; background:${g.status==='done'?'#cbd5e1':'#4f46e5'}">${g.status==='done'?'✓':''}</div></div></div>`;
}

function attachEvents() {
  document.querySelectorAll('input[type="text"]').forEach(i => i.onkeypress = (e) => { if (e.key === 'Enter') { const btn = i.parentElement.querySelector('button'); if (btn) btn.click(); }});
}

document.addEventListener('DOMContentLoaded', () => { setTimeout(render, 500); });
