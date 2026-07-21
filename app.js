"use strict";

const GOOGLE_URL="https://www.googleapis.com/books/v1/volumes";
const OPEN_URL="https://openlibrary.org/search.json";
const state={local:[],results:[],selected:null,selectedTopic:null,objective:"contextualizar",recommendations:[],knowledge:null,controller:null};
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const clean=s=>(s??"").toString().trim();
const norm=s=>clean(s).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
const uniq=a=>[...new Set((a||[]).map(clean).filter(Boolean))];
const esc=s=>clean(s).replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));
const store={get(k,d){try{return JSON.parse(localStorage.getItem(`rutas:${k}`))??d}catch{return d}},set(k,v){try{localStorage.setItem(`rutas:${k}`,JSON.stringify(v))}catch{}}};
const timestamp=()=>new Date().toISOString();

function field(value,source){return clean(value)||Array.isArray(value)&&value.length?{value,source}:null}
function first(...values){return values.find(Boolean)||null}
function idFor(b){const isbn=(b.isbns||[])[0];return isbn?`isbn:${isbn}`:`book:${norm(b.title)}:${norm((b.authors||[])[0])}`}
function stripHtml(s){if(typeof document==="undefined")return clean(s).replace(/<[^>]*>/g," ").replace(/\s+/g," ").trim();const d=document.createElement("div");d.innerHTML=s||"";return d.textContent||""}
function imageUrl(url){return clean(url).replace(/^http:/,"https:")}
function sourceName(s){return s==="google"?"Google Books":s==="openlibrary"?"Open Library":"Catálogo local"}

function fromGoogle(item){
  const v=item.volumeInfo||{}, ids=(v.industryIdentifiers||[]).map(x=>x.identifier).filter(Boolean);
  return {id:`google:${item.id}`,googleId:item.id,title:clean(v.title),authors:uniq(v.authors),cover:imageUrl(v.imageLinks?.thumbnail||v.imageLinks?.smallThumbnail),date:clean(v.publishedDate),publisher:clean(v.publisher),description:stripHtml(v.description),isbns:uniq(ids),subjects:uniq(v.categories),language:clean(v.language),sources:["google"],links:{google:v.infoLink||v.canonicalVolumeLink||""},provenance:{title:v.title?"google":null,authors:v.authors?.length?"google":null,cover:v.imageLinks?"google":null,date:v.publishedDate?"google":null,publisher:v.publisher?"google":null,description:v.description?"google":null,isbns:ids.length?"google":null,subjects:v.categories?.length?"google":null,language:v.language?"google":null}};
}
function fromOpen(doc){
  const isbns=uniq(doc.isbn), cover=doc.cover_i?`https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`:"";
  const description=clean(doc.first_sentence?.[0]||doc.first_sentence);
  return {id:`openlibrary:${doc.key||norm(doc.title)}`,openKey:doc.key,title:clean(doc.title),authors:uniq(doc.author_name),cover,date:clean(doc.first_publish_year),publisher:clean(doc.publisher?.[0]),description,isbns,subjects:uniq(doc.subject).slice(0,20),language:clean(doc.language?.[0]),sources:["openlibrary"],links:{openlibrary:doc.key?`https://openlibrary.org${doc.key}`:""},provenance:{title:doc.title?"openlibrary":null,authors:doc.author_name?.length?"openlibrary":null,cover:cover?"openlibrary":null,date:doc.first_publish_year?"openlibrary":null,publisher:doc.publisher?.length?"openlibrary":null,description:description?"openlibrary":null,isbns:isbns.length?"openlibrary":null,subjects:doc.subject?.length?"openlibrary":null,language:doc.language?.length?"openlibrary":null}};
}
function fromLocal(b){return {id:`local:${b.id}`,localId:b.id,title:clean(b.title),authors:uniq([b.author]),cover:"",date:clean(b.year),publisher:"",description:clean(b.summary),isbns:[],subjects:uniq(b.topics),language:"es",sources:["local"],links:{},provenance:{title:"local",authors:"local",cover:null,date:b.year?"local":null,publisher:null,description:b.summary?"local":null,isbns:null,subjects:b.topics?.length?"local":null,language:"local"}}}
function sameBook(a,b){const ai=new Set(a.isbns||[]);if((b.isbns||[]).some(x=>ai.has(x)))return true;return norm(a.title)===norm(b.title)&&norm(a.authors?.[0])===norm(b.authors?.[0])}
function mergeBook(a,b){
  const choose=(k,preferLong=false)=>{const av=a[k],bv=b[k];if(preferLong&&clean(bv).length>clean(av).length)return [bv,b.provenance[k]];return av&&(!Array.isArray(av)||av.length)?[av,a.provenance[k]]:[bv,b.provenance[k]]};
  const out={...a,sources:uniq([...a.sources,...b.sources]),links:{...a.links,...b.links},provenance:{...a.provenance}};
  for(const k of ["title","authors","cover","date","publisher","description","language"]){const [v,s]=choose(k,k==="description");out[k]=v;out.provenance[k]=s}
  out.isbns=uniq([...a.isbns,...b.isbns]);out.subjects=uniq([...a.subjects,...b.subjects]);
  out.provenance.isbns=a.isbns.length&&b.isbns.length?"google+openlibrary":a.provenance.isbns||b.provenance.isbns;
  out.provenance.subjects=a.subjects.length&&b.subjects.length?"google+openlibrary":a.provenance.subjects||b.provenance.subjects;
  out.id=idFor(out);return out;
}
function mergeLists(lists){const out=[];for(const b of lists.flat()){if(!b.title)continue;const i=out.findIndex(x=>sameBook(x,b));i<0?out.push({...b,id:idFor(b)}):out[i]=mergeBook(out[i],b)}return out}

async function fetchJSON(url,signal,timeout=9000){
  const ctl=new AbortController(), timer=setTimeout(()=>ctl.abort(),timeout), abort=()=>ctl.abort();signal?.addEventListener("abort",abort,{once:true});
  try{const r=await fetch(url,{signal:ctl.signal,headers:{Accept:"application/json"}});if(!r.ok)throw new Error(r.status===429?"Límite temporal de consultas alcanzado.":`La fuente respondió con error ${r.status}.`);return await r.json()}finally{clearTimeout(timer);signal?.removeEventListener("abort",abort)}
}
async function googleSearch(q,limit,signal){const url=`${GOOGLE_URL}?q=${encodeURIComponent(q)}&maxResults=${Math.min(limit,40)}&printType=books`;const d=await fetchJSON(url,signal);return (d.items||[]).map(fromGoogle)}
async function openSearch(q,limit,signal){const fields="key,title,author_name,cover_i,first_publish_year,publisher,isbn,subject,language,first_sentence";const url=`${OPEN_URL}?q=${encodeURIComponent(q)}&limit=${Math.min(limit,50)}&fields=${fields}`;const d=await fetchJSON(url,signal);return (d.docs||[]).map(fromOpen)}

function preference(){return store.get("preferences",{language:"",topics:[],limit:20})}
function localSearch(q){const n=norm(q);return state.local.filter(b=>norm(`${b.title} ${b.authors.join(" ")} ${b.subjects.join(" ")} ${b.isbns.join(" ")}`).includes(n)).slice(0,20)}
function remember(k,item,max=40){const list=store.get(k,[]).filter(x=>x.id!==item.id);list.unshift(item);store.set(k,list.slice(0,max))}
function serializable(b){return {id:b.id,title:b.title,authors:b.authors,cover:b.cover,date:b.date,publisher:b.publisher,description:b.description,isbns:b.isbns,subjects:b.subjects,language:b.language,sources:b.sources,links:b.links,provenance:b.provenance}}

async function searchBooks(query,{recommendation=false}={}){
  const q=clean(query);if(q.length<2)return;
  state.controller?.abort();state.controller=new AbortController();const {signal}=state.controller,p=preference();
  if(!recommendation){setNotice("Buscando en ambas fuentes…");$("#searchResults").innerHTML=loadingCards()}
  const jobs=navigator.onLine?[googleSearch(q,p.limit,signal),openSearch(q,p.limit,signal)]:[];
  const settled=await Promise.allSettled(jobs);if(signal.aborted)return [];
  const remote=settled.filter(x=>x.status==="fulfilled").flatMap(x=>x.value);const failed=settled.filter(x=>x.status==="rejected").map(x=>x.reason?.message||"Error de conexión");
  let combined=mergeLists([remote,localSearch(q)]);
  if(p.language)combined.sort((a,b)=>(b.language===p.language)-(a.language===p.language));
  if(p.topics?.length)combined.sort((a,b)=>topicHits(b,p.topics)-topicHits(a,p.topics));
  if(!recommendation){state.results=combined;remember("searches",{id:`${Date.now()}:${norm(q)}`,query:q,date:timestamp()},25);renderResults();renderActivity();!navigator.onLine?setNotice("Sin conexión: la búsqueda usa únicamente el catálogo local de respaldo."):failed.length?setNotice(`${failed.join(" ")} Se muestran los datos que sí están disponibles y el respaldo local.`,"error"):setNotice(`Resultados combinados. ${sourceSummary(combined)}`)}
  return combined;
}
function topicHits(b,topics){const bs=(b.subjects||[]).map(norm);return topics.filter(t=>bs.some(s=>s.includes(norm(t)))).length}
function sourceSummary(list){const g=list.filter(x=>x.sources.includes("google")).length,o=list.filter(x=>x.sources.includes("openlibrary")).length,l=list.filter(x=>x.sources.includes("local")).length;return `${g} con Google Books, ${o} con Open Library${l?` y ${l} del catálogo local`:""}.`}
function setNotice(msg,type=""){$("#searchStatus").textContent=msg;$("#searchStatus").className=`notice ${type}`}
function loadingCards(){return '<p class="empty">Consultando catálogos públicos…</p>'}

function coverHTML(b,large=false){return b.cover?`<img class="cover" src="${esc(b.cover)}" alt="Portada de ${esc(b.title)}" loading="lazy" referrerpolicy="no-referrer">`:`<div class="cover cover-placeholder">Sin portada</div>`}
function sourcePills(b){return b.sources.map(s=>`<span class="source-pill ${s}">${esc(sourceName(s))}</span>`).join("")}
function bookCard(b,reason=""){
  const fav=store.get("favorites",[]).some(x=>x.id===b.id), author=b.authors?.join(", ")||"Autor no disponible";
  return `<article class="book-card">${coverHTML(b)}<div><h3>${esc(b.title)}</h3><div class="meta">${esc(author)}${b.date?` · ${esc(b.date)}`:""}</div><div class="sources">${sourcePills(b)}</div>${reason?`<p class="meta"><strong>Relación:</strong> ${esc(reason)}</p>`:""}</div><div class="card-actions"><button class="action" data-open="${esc(b.id)}">Ver ficha</button><button class="action ${fav?"selected":""}" data-favorite="${esc(b.id)}">${fav?"✓ Favorito":"☆ Guardar"}</button></div></article>`
}
function renderResults(){$("#resultCount").textContent=`${state.results.length} libros`;$("#searchResults").innerHTML=state.results.length?state.results.map(b=>bookCard(b)).join(""):'<p class="empty">No encontramos libros. Prueba con el título completo, el autor o el ISBN.</p>'}
function lookup(id){return [...state.results,...state.recommendations,...state.local,...store.get("favorites",[]),...store.get("views",[]).map(x=>x.book)].find(x=>x?.id===id)}
function shown(v,source){return `<span>${esc(Array.isArray(v)?v.join(", "):v||"No disponible")}</span>${v?`<small class="provenance">Fuente: ${esc(sourceLabel(source))}</small>`:"<small class=\"provenance\">La fuente no proporciona este dato</small>"}`}
function sourceLabel(s){return clean(s).split("+").map(sourceName).join(" + ")}
function fieldHTML(label,value,source){return `<div class="field"><strong>${esc(label)}</strong>${shown(value,source)}</div>`}
function renderDetail(b){
  state.selected=b;remember("views",{id:b.id,date:timestamp(),book:serializable(b)},40);const rating=store.get("ratings",{})[b.id]||0;
  $("#detailPanel").classList.remove("hidden");$("#detailPanel").innerHTML=`<div class="detail">${coverHTML(b,true)}<div><p class="eyebrow">Ficha bibliográfica</p><h2>${esc(b.title)}</h2><div class="sources">${sourcePills(b)}</div><div class="detail-list">${fieldHTML("Autores",b.authors,b.provenance.authors)}${fieldHTML("Fecha",b.date,b.provenance.date)}${fieldHTML("Editorial",b.publisher,b.provenance.publisher)}${fieldHTML("ISBN",b.isbns,b.provenance.isbns)}${fieldHTML("Idioma",b.language,b.provenance.language)}${fieldHTML("Temas / categorías",b.subjects,b.provenance.subjects)}</div></div><div class="description"><h3>Descripción</h3>${shown(b.description,b.provenance.description)}</div><div class="detail-actions"><div class="card-actions">${Object.entries(b.links||{}).filter(([,v])=>v).map(([s,v])=>`<a class="action" href="${esc(v)}" target="_blank" rel="noopener">Abrir en ${esc(sourceName(s))}</a>`).join("")}<button class="action" data-favorite="${esc(b.id)}">☆ Guardar favorito</button></div><div class="rating" aria-label="Valorar libro">${[1,2,3,4,5].map(n=>`<button data-rating="${n}" class="${n<=rating?"active":""}" aria-label="${n} estrellas">★</button>`).join("")}</div></div></div>`;
  renderActivity();prepareRecommendationBuilder(b);$("#detailPanel").scrollIntoView({behavior:"smooth",block:"start"});
}
const OBJECTIVES={
  contextualizar:{label:"Contextualizar",empty:"No hay obras con el tema elegido y evidencia histórica o temporal suficiente."},
  ampliar:{label:"Ampliar",empty:"No hay obras que compartan el tema y añadan materias nuevas verificables."},
  cuestionar:{label:"Cuestionar",empty:"No hay obras con el tema elegido y señales explícitas de crítica, debate u oposición."},
  ficcion:{label:"Ficción relacionada",empty:"No hay obras clasificadas como ficción que compartan el tema elegido."},
  autor:{label:"Conocer al autor",empty:"No encontramos otras obras atribuidas al mismo autor en las fuentes."}
};
function mainTopics(b){const knowledgeThemes=state.knowledge?.themesFor(b)||[];return uniq([...knowledgeThemes,...(b.subjects||[])]).filter(x=>clean(x).length>2).slice(0,10)}
function prepareRecommendationBuilder(b){
  const topics=mainTopics(b),routePref=store.get("routePreference",{});state.selectedTopic=topics.find(t=>norm(t)===norm(routePref.topic))||topics[0]||null;state.objective=OBJECTIVES[routePref.objective]?routePref.objective:"contextualizar";
  $("#recommendationPanel").classList.remove("hidden");$("#mainTopics").innerHTML=topics.length?topics.map(t=>`<button class="chip ${t===state.selectedTopic?"active":""}" data-main-topic="${esc(t)}">${esc(t)}</button>`).join(""):'<p class="empty">Las fuentes no proporcionan temas para este libro.</p>';
  $$('[data-objective]').forEach(x=>x.classList.toggle("active",x.dataset.objective===state.objective));$("#recommendationTitle").textContent="Recomendaciones";$("#recommendationEyebrow").textContent="Selecciona una ruta";$("#recommendationEvidence").classList.add("hidden");$("#refreshRecommendations").classList.add("hidden");$("#recommendations").innerHTML=topics.length?'<p class="empty">Elige un tema y un objetivo para construir una ruta.</p>':'<p class="empty">Sin temas verificables no podemos generar relaciones.</p>';
}
function cachedBookForRef(ref){return [...state.results,...state.recommendations,...state.local,...store.get("favorites",[]),...store.get("views",[]).map(x=>x.book)].find(book=>state.knowledge?.matchesRef(book,ref))}
async function resolveRelationTarget(ref){
  const cached=cachedBookForRef(ref);if(cached)return cached;
  const query=ref.isbn?`isbn:${ref.isbn}`:[ref.title,ref.author].filter(Boolean).join(" ");if(!query)return null;
  const found=await searchBooks(query,{recommendation:true});return found.find(book=>state.knowledge.matchesRef(book,ref))||found[0]||null;
}
function knowledgeReason(item){const r=item.relation,type=item.relationType?.label||r.type,claims=(r.evidence?.claims||[]).join(" "),sources=(r.evidence?.sources||[]).map(s=>s.label||s.url).filter(Boolean).join("; ");return `Relación: ${type}. Tema compartido: ${(item.matchedThemes||r.themes).join(", ")}. Qué aporta: ${r.contribution} Explicación: ${r.explanation} Evidencia: ${claims} Fuentes de evidencia: ${sources}. Origen de la relación: ${r.provenance?.provider||"curación"}.`}
async function generateRecommendations(origin=state.selected){
  const topic=state.selectedTopic,objective=state.objective,meta=OBJECTIVES[objective];if(!origin||!state.knowledge||(!topic&&objective!=="autor"))return;
  $("#recommendations").innerHTML=loadingCards();$("#recommendationTitle").textContent=meta.label;$("#recommendationEyebrow").textContent=objective==="autor"?`Autor: ${origin.authors?.[0]||"no disponible"}`:`Tema: ${topic}`;$("#recommendationEvidence").textContent="Las relaciones proceden del grafo propio y deben estar aprobadas, tipificadas y respaldadas por evidencia. Las APIs solo completan la ficha bibliográfica.";$("#recommendationEvidence").classList.remove("hidden");$("#refreshRecommendations").classList.remove("hidden");
  const matches=state.knowledge.find(origin,{theme:topic,objective,statuses:["approved"]});
  const resolved=[];for(const item of matches){const book=await resolveRelationTarget(item.target);if(book)resolved.push({book,item})}
  state.recommendations=resolved.map(x=>x.book);$("#recommendations").innerHTML=resolved.length?resolved.map(x=>bookCard(x.book,knowledgeReason(x.item))).join(""):'<p class="empty">El grafo de conocimiento todavía no contiene una relación aprobada con este tema y objetivo. No mostramos similitudes calculadas por las APIs.</p>';
  remember("routes",{id:`${Date.now()}:${origin.id}:${objective}:${norm(topic)}`,date:timestamp(),book:origin.title,bookId:origin.id,topic,objective,count:resolved.length,engine:"knowledge-graph-v1"},40);store.set("routePreference",{topic,objective});renderActivity();
}

function toggleFavorite(b){let list=store.get("favorites",[]);const exists=list.some(x=>x.id===b.id);list=exists?list.filter(x=>x.id!==b.id):[serializable(b),...list].slice(0,100);store.set("favorites",list);renderResults();renderFavorites();toast(exists?"Eliminado de favoritos":"Guardado en favoritos")}
function renderFavorites(){const list=store.get("favorites",[]);$("#favoriteCount").textContent=`${list.length} libros`;$("#favoritesGrid").innerHTML=list.length?list.map(b=>bookCard(b)).join(""):'<p class="empty">Todavía no guardaste libros.</p>'}
function renderActivity(){const searches=store.get("searches",[]),views=store.get("views",[]),favorites=store.get("favorites",[]),routes=store.get("routes",[]);$("#activityStats").innerHTML=[[searches.length,"Búsquedas"],[views.length,"Vistos"],[favorites.length,"Favoritos"],[routes.length,"Rutas"]].map(([n,l])=>`<div class="stat"><strong>${n}</strong>${l}</div>`).join("");$("#routeHistory").innerHTML=routes.length?routes.slice(0,10).map(x=>`<div class="history-item"><strong>${esc(x.book)}</strong><br><span class="meta">${esc(x.topic||"Autor")} · ${esc(OBJECTIVES[x.objective]?.label||x.objective)} · ${x.count} resultados</span></div>`).join(""):'<p class="empty">Sin rutas todavía.</p>';$("#searchHistory").innerHTML=searches.length?searches.slice(0,10).map(x=>`<button class="history-item" data-query="${esc(x.query)}"><strong>${esc(x.query)}</strong><br><span class="meta">${new Date(x.date).toLocaleString("es-AR")}</span></button>`).join(""):'<p class="empty">Sin búsquedas todavía.</p>';$("#viewHistory").innerHTML=views.length?views.slice(0,10).map(x=>`<button class="history-item" data-open="${esc(x.book.id)}"><strong>${esc(x.book.title)}</strong><br><span class="meta">${esc(x.book.authors?.join(", ")||"")}</span></button>`).join(""):'<p class="empty">Sin libros vistos todavía.</p>'}
function renderPreferences(){const p=preference();$("#languagePreference").value=p.language||"";$("#topicPreference").value=(p.topics||[]).join(", ");$("#resultLimit").value=String(p.limit||20)}
function switchView(view){$$('.tab').forEach(x=>x.classList.toggle('active',x.dataset.view===view));$$('.view').forEach(x=>x.classList.toggle('active',x.id===`view-${view}`))}
function toast(msg){const t=$("#toast");t.textContent=msg;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),1800)}
function updateNetwork(){const online=navigator.onLine;$("#networkBadge").textContent=online?"En línea · 2 fuentes":"Sin conexión · respaldo local";$("#networkBadge").classList.toggle("offline",!online)}

function bind(){
  $("#searchForm").addEventListener("submit",e=>{e.preventDefault();searchBooks($("#searchInput").value)});$$('.tab').forEach(x=>x.addEventListener('click',()=>switchView(x.dataset.view)));
  document.body.addEventListener("click",e=>{const q=e.target.closest("[data-query]"),o=e.target.closest("[data-open]"),f=e.target.closest("[data-favorite]"),r=e.target.closest("[data-rating]");if(q){$("#searchInput").value=q.dataset.query;switchView("buscar");searchBooks(q.dataset.query)}if(o){const b=lookup(o.dataset.open);if(b){switchView("buscar");renderDetail(b)}}if(f){const b=lookup(f.dataset.favorite)||state.selected;if(b)toggleFavorite(b)}if(r&&state.selected){const ratings=store.get("ratings",{});ratings[state.selected.id]=Number(r.dataset.rating);store.set("ratings",ratings);renderDetail(state.selected);toast("Valoración guardada")}});
  $("#refreshRecommendations").addEventListener("click",()=>state.selected&&generateRecommendations(state.selected));
  $("#mainTopics").addEventListener("click",e=>{const chip=e.target.closest("[data-main-topic]");if(!chip)return;state.selectedTopic=chip.dataset.mainTopic;$$('[data-main-topic]').forEach(x=>x.classList.toggle("active",x===chip))});
  $("#objectiveChips").addEventListener("click",e=>{const chip=e.target.closest("[data-objective]");if(!chip)return;state.objective=chip.dataset.objective;$$('[data-objective]').forEach(x=>x.classList.toggle("active",x===chip))});
  $("#buildRecommendations").addEventListener("click",()=>generateRecommendations(state.selected));
  $("#preferencesForm").addEventListener("submit",e=>{e.preventDefault();store.set("preferences",{language:$("#languagePreference").value,topics:$("#topicPreference").value.split(",").map(clean).filter(Boolean),limit:Number($("#resultLimit").value)});toast("Preferencias guardadas")});
  $("#exportData").addEventListener("click",()=>{const data={exportedAt:timestamp(),searches:store.get("searches",[]),views:store.get("views",[]),routes:store.get("routes",[]),favorites:store.get("favorites",[]),ratings:store.get("ratings",{}),preferences:preference(),routePreference:store.get("routePreference",{})};const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:"application/json"}));a.download="rutas-de-lectura-datos.json";a.click();URL.revokeObjectURL(a.href)});
  $("#clearData").addEventListener("click",()=>{if(!confirm("¿Borrar historial, favoritos, valoraciones y preferencias de este dispositivo?"))return;Object.keys(localStorage).filter(k=>k.startsWith("rutas:")).forEach(k=>localStorage.removeItem(k));renderFavorites();renderActivity();renderPreferences();toast("Datos locales borrados")});
  addEventListener("online",updateNetwork);addEventListener("offline",updateNetwork);
}
function registerPWA(){if("serviceWorker"in navigator)navigator.serviceWorker.register("./service-worker.js");let deferred;addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferred=e;$("#installBtn").classList.remove("hidden")});$("#installBtn").addEventListener("click",async()=>{if(!deferred)return;deferred.prompt();await deferred.userChoice;deferred=null;$("#installBtn").classList.add("hidden")})}
function submitKnowledgeProposal(input,provenance={}){if(!state.knowledge)throw new Error("El motor de conocimiento no está listo");const relation=state.knowledge.propose(input,{provider:"user",...provenance});const pending=state.knowledge.export({statuses:["proposed"]}).relations;store.set("knowledgeContributions",pending);return relation}
function registerKnowledgeProvider(provider){if(!state.knowledge)throw new Error("El motor de conocimiento no está listo");state.knowledge.registerProvider(provider)}
async function init(){
  try{const data=await fetch("./books.json").then(r=>{if(!r.ok)throw Error();return r.json()});state.local=data.map(fromLocal)}catch{state.local=[]}
  try{const knowledge=await fetch("./knowledge-base.json").then(r=>{if(!r.ok)throw Error();return r.json()});state.knowledge=KnowledgeEngine.create(knowledge);state.knowledge.ingest(store.get("knowledgeContributions",[]),"user-local")}catch{state.knowledge=KnowledgeEngine.create({schemaVersion:1,relationTypes:[],relations:[]})}
  bind();renderFavorites();renderActivity();renderPreferences();updateNetwork();registerPWA();if(!navigator.onLine){state.results=state.local.slice(0,20);renderResults();setNotice("Sin conexión: se muestra el catálogo local y el grafo de conocimiento guardado.")}
}

window.RutasInternals={fromGoogle,fromOpen,fromLocal,mergeBook,mergeLists,sameBook,mainTopics,norm};
window.RutasKnowledge={submitProposal:submitKnowledgeProposal,registerProvider:registerKnowledgeProvider,getEngine:()=>state.knowledge};
if(typeof document!=="undefined")init();
