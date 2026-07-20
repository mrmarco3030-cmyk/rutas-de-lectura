
let books = [];
const state = { selectedTopic:null, route:[] };
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const norm = s => (s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
const label = s => (s||"").replaceAll("-"," ").replace(/\b\w/g,c=>c.toUpperCase());
const storage = {
  get:(k,d=[])=>JSON.parse(localStorage.getItem(k)||JSON.stringify(d)),
  set:(k,v)=>localStorage.setItem(k,JSON.stringify(v))
};
function toast(msg){ const el=$("#toast"); el.textContent=msg; el.classList.add("show"); setTimeout(()=>el.classList.remove("show"),1800); }
function currentBook(){ return books.find(b=>b.id===$("#bookSelect").value)||books[0]; }
function sharedTopics(a,b){ return a.topics.filter(t=>b.topics.includes(t)); }

async function init(){
  books = await fetch("./books.json").then(r=>r.json());
  fillSelectors(); bind(); renderBook(); renderLibrary(); renderSaved(); renderActivity(); registerPWA();
}
function fillSelectors(){
  $("#bookSelect").innerHTML=books.map(b=>`<option value="${b.id}">${b.title} — ${b.author}</option>`).join("");
  const genres=[...new Set(books.map(b=>b.genre))].sort();
  $("#genreFilter").innerHTML+=genres.map(g=>`<option value="${g}">${label(g)}</option>`).join("");
  const topics=[...new Set(books.flatMap(b=>b.topics))].sort();
  $("#topicFilter").innerHTML+=topics.map(t=>`<option value="${t}">${label(t)}</option>`).join("");
  $("#libraryStats").innerHTML=statsHTML(books.length,topics.length,genres.length,["Libros","Temas","Géneros"]);
}
function renderBook(){
  const b=currentBook(); if(!b)return;
  $("#bookInfo").innerHTML=`<strong>${b.title}</strong> · ${b.author} (${b.year>0?b.year:"Antigüedad"})<br>${b.summary}`;
  state.selectedTopic=b.topics[0];
  $("#topicChips").innerHTML=b.topics.map(t=>`<button class="chip ${t===state.selectedTopic?"active":""}" data-topic="${t}">${label(t)}</button>`).join("");
}
function scoreBook(origin,candidate,approach,goal){
  const shared=sharedTopics(origin,candidate);
  let score=shared.length*12;
  if(approach==="todos"||candidate.approach===approach) score+=7;
  if(goal==="contextualizar" && ["academico","novela-historica","biografia"].includes(candidate.approach)) score+=5;
  if(goal==="cuestionar" && candidate.genre!==origin.genre) score+=4;
  if(goal==="aplicar" && candidate.genre!==origin.genre) score+=3;
  score+=Math.random()*2;
  return {candidate,shared,score};
}
function buildReason(origin,item,shared,goal){
  const topicText=shared.length?shared.slice(0,3).map(label).join(", "):label(state.selectedTopic);
  const goals={
    ampliar:`Amplía los temas ${topicText} desde otra obra y permite seguir desarrollando la idea central.`,
    contextualizar:`Aporta contexto para comprender ${topicText} desde una perspectiva histórica, social o conceptual.`,
    cuestionar:`Ofrece una mirada diferente que puede poner en tensión las ideas de ${origin.title}.`,
    aplicar:`Traslada ${topicText} a otro género o campo, ayudando a ver nuevas conexiones.`
  };
  return goals[goal];
}
function createRoute(){
  const origin=currentBook(), approach=$("#approachSelect").value, goal=$("#goalSelect").value;
  const ranked=books.filter(b=>b.id!==origin.id && (b.topics.includes(state.selectedTopic)||sharedTopics(origin,b).length))
    .map(b=>scoreBook(origin,b,approach,goal)).sort((a,b)=>b.score-a.score).slice(0,6);
  state.route=ranked;
  $("#recommendations").innerHTML=ranked.length?ranked.map((x,i)=>`
    <article class="card">
      <span class="badge">${label(x.candidate.approach)}</span>
      <h3>${x.candidate.title}</h3>
      <div class="meta">${x.candidate.author} · ${x.candidate.year}</div>
      <p class="reason"><strong>Por qué se relaciona:</strong> ${buildReason(origin,x.candidate,x.shared,goal)}</p>
      <div class="topics">${x.shared.slice(0,4).map(t=>`<span class="topic-tag">${label(t)}</span>`).join("")}</div>
      <div class="card-actions">
        <button class="action" data-action="useful" data-id="${x.candidate.id}">👍 Útil</button>
        <button class="action" data-action="wrong" data-id="${x.candidate.id}">⚠️ No encaja</button>
        <button class="action" data-action="save" data-id="${x.candidate.id}">🔖 Guardar</button>
      </div>
    </article>`).join(""):`<p class="empty">No encontramos coincidencias.</p>`;
  const hist=storage.get("history");
  hist.unshift({date:new Date().toISOString(),book:origin.title,topic:state.selectedTopic,approach,goal});
  storage.set("history",hist.slice(0,30));
  renderActivity();
}
function bookCard(b){
  const saved=storage.get("saved").includes(b.id);
  return `<article class="book-card">
    <span class="badge">${label(b.approach)}</span><h3>${b.title}</h3>
    <div class="meta">${b.author} · ${b.year}</div>
    <p class="small">${b.summary}</p>
    <div class="topics">${b.topics.slice(0,4).map(t=>`<span class="topic-tag">${label(t)}</span>`).join("")}</div>
    <div class="card-actions"><button class="action" data-open="${b.id}">Explorar</button><button class="action ${saved?"selected":""}" data-save="${b.id}">${saved?"✓ Guardado":"🔖 Guardar"}</button></div>
  </article>`;
}
function renderLibrary(){
  const q=norm($("#librarySearch").value), genre=$("#genreFilter").value, topic=$("#topicFilter").value;
  const filtered=books.filter(b=>(genre==="todos"||b.genre===genre)&&(topic==="todos"||b.topics.includes(topic))&&(!q||norm(`${b.title} ${b.author} ${b.topics.join(" ")}`).includes(q)));
  $("#libraryGrid").innerHTML=filtered.length?filtered.map(bookCard).join(""):`<p class="empty">No hay resultados.</p>`;
}
function renderSaved(){
  const ids=storage.get("saved");
  const list=ids.map(id=>books.find(b=>b.id===id)).filter(Boolean);
  $("#savedGrid").innerHTML=list.length?list.map(bookCard).join(""):`<p class="empty">Todavía no guardaste libros.</p>`;
}
function renderActivity(){
  const history=storage.get("history"), feedback=storage.get("feedback");
  $("#activityStats").innerHTML=statsHTML(history.length,storage.get("saved").length,feedback.length,["Rutas","Guardados","Valoraciones"]);
  $("#historyList").innerHTML=history.length?history.map(h=>`<div class="history-item"><strong>${h.book}</strong><br>${label(h.topic)} · ${label(h.goal)}<br><span class="small">${new Date(h.date).toLocaleString("es-AR")}</span></div>`).join(""):`<p class="empty">Todavía no creaste rutas.</p>`;
}
function statsHTML(a,b,c,n){return [[a,n[0]],[b,n[1]],[c,n[2]]].map(x=>`<div class="stat"><strong>${x[0]}</strong>${x[1]}</div>`).join("")}
function toggleSave(id){
  let saved=storage.get("saved");
  saved=saved.includes(id)?saved.filter(x=>x!==id):[id,...saved];
  storage.set("saved",saved); renderLibrary(); renderSaved(); renderActivity(); toast(saved.includes(id)?"Libro guardado":"Libro eliminado");
}
function openBook(id){
  $("#bookSelect").value=id; renderBook(); switchView("explorar"); window.scrollTo({top:0,behavior:"smooth"});
}
function switchView(view){
  $$(".tab").forEach(x=>x.classList.toggle("active",x.dataset.view===view));
  $$(".view").forEach(x=>x.classList.toggle("active",x.id===`view-${view}`));
}
function bind(){
  $$(".tab").forEach(t=>t.addEventListener("click",()=>switchView(t.dataset.view)));
  $("#bookSelect").addEventListener("change",renderBook);
  $("#startSearch").addEventListener("input",e=>{
    const q=norm(e.target.value); const match=books.find(b=>norm(`${b.title} ${b.author}`).includes(q));
    if(match&&q.length>2){$("#bookSelect").value=match.id;renderBook();}
  });
  $("#topicChips").addEventListener("click",e=>{const b=e.target.closest("[data-topic]");if(!b)return;state.selectedTopic=b.dataset.topic;$$(".chip").forEach(x=>x.classList.toggle("active",x===b));});
  $("#buildRoute").addEventListener("click",createRoute); $("#newRoute").addEventListener("click",createRoute);
  $("#recommendations").addEventListener("click",e=>{
    const b=e.target.closest("[data-action]");if(!b)return;
    if(b.dataset.action==="save")toggleSave(b.dataset.id);
    else{const f=storage.get("feedback");f.unshift({book:b.dataset.id,type:b.dataset.action,date:new Date().toISOString()});storage.set("feedback",f.slice(0,100));b.classList.add("selected");b.textContent="✓ Registrado";renderActivity();}
  });
  ["#librarySearch","#genreFilter","#topicFilter"].forEach(s=>$(s).addEventListener("input",renderLibrary));
  document.body.addEventListener("click",e=>{const o=e.target.closest("[data-open]"),s=e.target.closest("[data-save]");if(o)openBook(o.dataset.open);if(s)toggleSave(s.dataset.save);});
  $("#clearSaved").addEventListener("click",()=>{storage.set("saved",[]);renderSaved();renderLibrary();renderActivity();});
  $("#exportData").addEventListener("click",()=>{
    const data={saved:storage.get("saved"),history:storage.get("history"),feedback:storage.get("feedback")};
    const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:"application/json"}));a.download="rutas-lectura-datos.json";a.click();
  });
}
function registerPWA(){
  if("serviceWorker"in navigator)navigator.serviceWorker.register("./service-worker.js");
  let deferred; window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferred=e;$("#installBtn").classList.remove("hidden")});
  $("#installBtn").addEventListener("click",async()=>{if(!deferred)return;deferred.prompt();await deferred.userChoice;deferred=null;$("#installBtn").classList.add("hidden")});
}
init().catch(()=>{$("main").innerHTML='<section class="panel"><h2>Error al cargar el catálogo</h2><p>Revisa que books.json esté subido en la raíz del repositorio.</p></section>'});
