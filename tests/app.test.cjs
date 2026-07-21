const assert=require("node:assert/strict");
global.window={};
require("../app.js");
const {fromGoogle,fromOpen,mergeLists,mainTopics,norm}=window.RutasInternals;

const google=fromGoogle({id:"g1",volumeInfo:{title:"Cien años de soledad",authors:["Gabriel García Márquez"],publishedDate:"1967",industryIdentifiers:[{type:"ISBN_13",identifier:"9780307474728"}],categories:["Fiction / Latin America"],description:"Descripción de Google",language:"es"}});
const open=fromOpen({key:"/works/OL1W",title:"Cien años de soledad",author_name:["Gabriel Garcia Marquez"],first_publish_year:1967,isbn:["9780307474728"],subject:["Magical realism","Latin America"],language:["spa"]});
const merged=mergeLists([[google],[open]]);

assert.equal(merged.length,1,"debe deduplicar ediciones con el mismo ISBN");
assert.deepEqual(merged[0].sources.sort(),["google","openlibrary"]);
assert.equal(merged[0].description,"Descripción de Google");
assert.equal(merged[0].provenance.subjects,"google+openlibrary");
assert.ok(merged[0].subjects.includes("Magical realism"));
assert.ok(mainTopics(merged[0]).includes("Latin America"));
assert.equal(norm("García Márquez"),"garcia marquez");
console.log("OK: metadatos, normalización, deduplicación y procedencia verificados.");
