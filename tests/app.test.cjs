const assert=require("node:assert/strict");
global.window={};
require("../app.js");
const {fromGoogle,fromOpen,mergeLists,relationScore,norm}=window.RutasInternals;

const google=fromGoogle({id:"g1",volumeInfo:{title:"Cien años de soledad",authors:["Gabriel García Márquez"],publishedDate:"1967",industryIdentifiers:[{type:"ISBN_13",identifier:"9780307474728"}],categories:["Fiction / Latin America"],description:"Descripción de Google",language:"es"}});
const open=fromOpen({key:"/works/OL1W",title:"Cien años de soledad",author_name:["Gabriel Garcia Marquez"],first_publish_year:1967,isbn:["9780307474728"],subject:["Magical realism","Latin America"],language:["spa"]});
const merged=mergeLists([[google],[open]]);

assert.equal(merged.length,1,"debe deduplicar ediciones con el mismo ISBN");
assert.deepEqual(merged[0].sources.sort(),["google","openlibrary"]);
assert.equal(merged[0].description,"Descripción de Google");
assert.equal(merged[0].provenance.subjects,"google+openlibrary");
assert.ok(merged[0].subjects.includes("Magical realism"));
assert.equal(norm("García Márquez"),"garcia marquez");

const related=fromOpen({key:"/works/OL2W",title:"El amor en los tiempos del cólera",author_name:["Gabriel García Márquez"],subject:["Latin America","Love"]});
const relation=relationScore(merged[0],related);
assert.ok(relation.score>0,"una coincidencia real debe producir puntuación");
assert.match(relation.reason,/autor|temas compartidos/);

const unrelated=fromOpen({key:"/works/OL3W",title:"Libro sin relación",author_name:["Otra persona"],subject:["Mathematics"]});
assert.equal(relationScore(merged[0],unrelated).score,0,"no debe inventar una relación");

console.log("OK: normalización, deduplicación, procedencia y recomendaciones verificadas.");
