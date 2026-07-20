
const library = [
  {
    id: "1984",
    title: "1984",
    author: "George Orwell",
    summary: "Una novela sobre vigilancia, manipulación del lenguaje, poder político y control de la verdad.",
    topics: ["poder", "vigilancia", "lenguaje", "libertad"],
    recommendations: [
      { title: "Vigilar y castigar", author: "Michel Foucault", approach: "academico", topics: ["poder","vigilancia"], reason: "Amplía la idea de vigilancia mostrando cómo las instituciones disciplinan los cuerpos y las conductas." },
      { title: "Un mundo feliz", author: "Aldous Huxley", approach: "ciencia-ficcion", topics: ["poder","libertad"], reason: "Contrasta el control por miedo con un control basado en placer, consumo y condicionamiento." },
      { title: "La rebelión de las masas", author: "José Ortega y Gasset", approach: "ensayo", topics: ["poder","libertad"], reason: "Aporta una mirada filosófica sobre sociedad de masas, autoridad y vida pública." },
      { title: "El cuento de la criada", author: "Margaret Atwood", approach: "ficcion", topics: ["poder","libertad"], reason: "Explora cómo un régimen autoritario controla los cuerpos, el lenguaje y la memoria." },
      { title: "George Orwell: una vida", author: "D. J. Taylor", approach: "biografia", topics: ["lenguaje","poder"], reason: "Permite comprender las experiencias políticas y personales que formaron las ideas del autor." }
    ]
  },
  {
    id: "sapiens",
    title: "Sapiens",
    author: "Yuval Noah Harari",
    summary: "Una interpretación general de la historia humana, desde la evolución hasta las sociedades contemporáneas.",
    topics: ["historia", "religion", "economia", "tecnologia"],
    recommendations: [
      { title: "Armas, gérmenes y acero", author: "Jared Diamond", approach: "academico", topics: ["historia","tecnologia"], reason: "Ofrece otra explicación de las desigualdades históricas, centrada en geografía, cultivos y tecnología." },
      { title: "La gran transformación", author: "Karl Polanyi", approach: "ensayo", topics: ["economia","historia"], reason: "Profundiza en la aparición de la economía de mercado y sus efectos sociales." },
      { title: "Los pilares de la Tierra", author: "Ken Follett", approach: "novela-historica", topics: ["historia","religion"], reason: "Convierte procesos sociales, religiosos y económicos medievales en una experiencia narrativa." },
      { title: "El gen egoísta", author: "Richard Dawkins", approach: "academico", topics: ["historia","tecnologia"], reason: "Complementa la mirada histórica con una explicación evolutiva centrada en selección natural y genes." },
      { title: "Homo Deus", author: "Yuval Noah Harari", approach: "ensayo", topics: ["tecnologia","economia"], reason: "Continúa la reflexión hacia posibles futuros humanos dominados por datos, algoritmos y biotecnología." }
    ]
  },
  {
    id: "principito",
    title: "El principito",
    author: "Antoine de Saint-Exupéry",
    summary: "Una fábula sobre vínculos, responsabilidad, imaginación, soledad y sentido de la vida.",
    topics: ["amistad", "sentido", "infancia", "soledad"],
    recommendations: [
      { title: "Momo", author: "Michael Ende", approach: "ficcion", topics: ["amistad","sentido"], reason: "Explora el valor del tiempo, la escucha y los vínculos frente a una sociedad acelerada." },
      { title: "El hombre en busca de sentido", author: "Viktor Frankl", approach: "ensayo", topics: ["sentido","soledad"], reason: "Profundiza en la búsqueda de propósito desde una experiencia humana y psicológica extrema." },
      { title: "Peter Pan", author: "J. M. Barrie", approach: "ficcion", topics: ["infancia","soledad"], reason: "Permite comparar dos visiones de la infancia, la pérdida y la dificultad de crecer." },
      { title: "Saint-Exupéry", author: "Stacy Schiff", approach: "biografia", topics: ["sentido","soledad"], reason: "Relaciona la obra con la vida del autor, su experiencia como aviador y su mirada humanista." }
    ]
  },
  {
    id: "cien-anos",
    title: "Cien años de soledad",
    author: "Gabriel García Márquez",
    summary: "La historia de la familia Buendía y de Macondo, atravesada por memoria, violencia, deseo y repetición histórica.",
    topics: ["memoria", "familia", "violencia", "america-latina"],
    recommendations: [
      { title: "La casa de los espíritus", author: "Isabel Allende", approach: "ficcion", topics: ["familia","america-latina"], reason: "Comparte una saga familiar latinoamericana donde lo político y lo fantástico se entrelazan." },
      { title: "Las venas abiertas de América Latina", author: "Eduardo Galeano", approach: "ensayo", topics: ["violencia","america-latina"], reason: "Aporta contexto histórico y económico para comprender conflictos presentes en la novela." },
      { title: "Yo, el Supremo", author: "Augusto Roa Bastos", approach: "novela-historica", topics: ["violencia","memoria"], reason: "Profundiza en poder, autoritarismo y construcción de la memoria en América Latina." },
      { title: "Vivir para contarla", author: "Gabriel García Márquez", approach: "biografia", topics: ["memoria","familia"], reason: "Muestra recuerdos y experiencias que alimentaron personajes, lugares y atmósferas de su ficción." }
    ]
  }
];

const state = {
  selectedTopic: null,
  currentRoute: []
};

const bookSelect = document.querySelector("#bookSelect");
const bookSummary = document.querySelector("#bookSummary");
const topicButtons = document.querySelector("#topicButtons");
const approachSelect = document.querySelector("#approachSelect");
const recommendations = document.querySelector("#recommendations");
const savedRoutes = document.querySelector("#savedRoutes");
const installBtn = document.querySelector("#installBtn");
let deferredPrompt = null;

function currentBook() {
  return library.find(book => book.id === bookSelect.value) || library[0];
}

function renderBookOptions() {
  bookSelect.innerHTML = library
    .map(book => `<option value="${book.id}">${book.title} — ${book.author}</option>`)
    .join("");
}

function renderBook() {
  const book = currentBook();
  bookSummary.innerHTML = `<strong>${book.title}</strong><br>${book.summary}`;
  state.selectedTopic = book.topics[0];
  topicButtons.innerHTML = book.topics
    .map(topic => `<button class="chip ${topic === state.selectedTopic ? "active" : ""}" data-topic="${topic}">${formatLabel(topic)}</button>`)
    .join("");
}

function formatLabel(value) {
  return value.replaceAll("-", " ").replace(/\b\w/g, c => c.toUpperCase());
}

function buildRoute() {
  const book = currentBook();
  const approach = approachSelect.value;
  let matches = book.recommendations.filter(item => item.topics.includes(state.selectedTopic));

  if (approach !== "todos") {
    const filtered = matches.filter(item => item.approach === approach);
    if (filtered.length) matches = filtered;
  }

  if (!matches.length) matches = book.recommendations;

  state.currentRoute = [...matches].sort(() => Math.random() - 0.5).slice(0, 4);
  renderRecommendations();
  saveRouteHistory(book);
}

function renderRecommendations() {
  if (!state.currentRoute.length) {
    recommendations.innerHTML = `<p class="empty">No encontramos una coincidencia exacta. Prueba otro enfoque.</p>`;
    return;
  }

  recommendations.innerHTML = state.currentRoute.map((item, index) => `
    <article class="card">
      <div class="card-top">
        <div>
          <h3>${item.title}</h3>
          <div class="meta">${item.author}</div>
        </div>
        <span class="badge">${formatLabel(item.approach)}</span>
      </div>
      <p class="reason"><strong>Por qué está en esta ruta:</strong> ${item.reason}</p>
      <div class="actions">
        <button class="action" data-action="useful" data-index="${index}">👍 Me sirve</button>
        <button class="action" data-action="not-related" data-index="${index}">⚠️ No se relaciona</button>
        <button class="action" data-action="save" data-index="${index}">🔖 Guardar</button>
      </div>
    </article>
  `).join("");
}

function saveRouteHistory(book) {
  const history = JSON.parse(localStorage.getItem("readingRoutes") || "[]");
  history.unshift({
    id: Date.now(),
    book: book.title,
    topic: state.selectedTopic,
    approach: approachSelect.value,
    date: new Date().toLocaleDateString("es-AR")
  });
  localStorage.setItem("readingRoutes", JSON.stringify(history.slice(0, 8)));
  renderSavedRoutes();
}

function renderSavedRoutes() {
  const history = JSON.parse(localStorage.getItem("readingRoutes") || "[]");
  const savedBooks = JSON.parse(localStorage.getItem("savedBooks") || "[]");

  if (!history.length && !savedBooks.length) {
    savedRoutes.innerHTML = `<p class="empty">Todavía no guardaste recorridos.</p>`;
    return;
  }

  const routesHtml = history.map(route => `
    <div class="saved-item">
      <strong>${route.book}</strong> · ${formatLabel(route.topic)} · ${formatLabel(route.approach)}<br>
      <small>${route.date}</small>
    </div>
  `).join("");

  const savedHtml = savedBooks.map(book => `
    <div class="saved-item">🔖 <strong>${book.title}</strong> — ${book.author}</div>
  `).join("");

  savedRoutes.innerHTML = savedHtml + routesHtml;
}

bookSelect.addEventListener("change", () => {
  renderBook();
  recommendations.innerHTML = `<p class="empty">Selecciona un tema y crea tu ruta.</p>`;
});

topicButtons.addEventListener("click", event => {
  const button = event.target.closest("[data-topic]");
  if (!button) return;
  state.selectedTopic = button.dataset.topic;
  [...topicButtons.children].forEach(el => el.classList.toggle("active", el === button));
});

document.querySelector("#exploreBtn").addEventListener("click", buildRoute);
document.querySelector("#refreshBtn").addEventListener("click", buildRoute);

recommendations.addEventListener("click", event => {
  const button = event.target.closest("[data-action]");
  if (!button) return;

  const item = state.currentRoute[Number(button.dataset.index)];
  button.classList.add("selected");

  if (button.dataset.action === "save") {
    const saved = JSON.parse(localStorage.getItem("savedBooks") || "[]");
    if (!saved.some(book => book.title === item.title)) saved.unshift(item);
    localStorage.setItem("savedBooks", JSON.stringify(saved.slice(0, 20)));
    button.textContent = "✓ Guardado";
    renderSavedRoutes();
  }

  if (button.dataset.action === "useful") button.textContent = "✓ Recomendación útil";
  if (button.dataset.action === "not-related") button.textContent = "✓ Opinión registrada";
});

window.addEventListener("beforeinstallprompt", event => {
  event.preventDefault();
  deferredPrompt = event;
  installBtn.classList.remove("hidden");
});

installBtn.addEventListener("click", async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null;
  installBtn.classList.add("hidden");
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("service-worker.js"));
}

renderBookOptions();
renderBook();
renderSavedRoutes();
