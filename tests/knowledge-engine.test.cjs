const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const KnowledgeEngine=require("../knowledge-engine.js");
const document=JSON.parse(fs.readFileSync(path.join(__dirname,"..","knowledge-base.json"),"utf8"));
const engine=KnowledgeEngine.create(document);

const origin={localId:"1984",title:"1984",authors:["George Orwell"],isbns:[]};
const contextual=engine.find(origin,{theme:"totalitarismo",objective:"contextualizar"});
assert.ok(contextual.some(x=>x.relation.id==="1984-origenes-totalitarismo"));
assert.equal(contextual[0].relation.status,"approved");
assert.ok(contextual[0].relation.evidence.claims.length>0);
assert.ok(contextual[0].relation.evidence.sources.length>0);

const authorRoute=engine.find(origin,{theme:"poder",objective:"autor"});
assert.ok(authorRoute.some(x=>x.relation.type==="mismo_autor"));
assert.ok(engine.themesFor(origin).includes("totalitarismo"));
const reverse=engine.find({localId:"rebelion-granja",title:"Rebelión en la granja",authors:["George Orwell"]},{theme:"poder",objective:"autor"});
assert.equal(reverse[0].direction,"reverse");
assert.equal(engine.find(origin,{theme:"cosmología",objective:"ampliar"}).length,0);

const proposal=engine.propose({id:"proposal-test",type:"amplia",from:{localId:"1984"},to:{localId:"mundo-feliz"},themes:["lenguaje"],explanation:"Propuesta pendiente de revisión.",contribution:"Ejemplo de extensión.",evidence:{claims:["Afirmación por revisar."],sources:[{kind:"user",label:"Contribución de prueba"}]}},{provider:"user",userId:"test"});
assert.equal(proposal.status,"proposed");
assert.equal(engine.find(origin,{theme:"lenguaje",objective:"ampliar"}).some(x=>x.relation.id==="proposal-test"),false);
assert.equal(engine.find(origin,{theme:"lenguaje",objective:"ampliar",statuses:["proposed"]}).length,1);

const invalid=engine.validate({id:"bad",type:"desconocida"});
assert.equal(invalid.valid,false);
assert.ok(invalid.errors.includes("evidence.sources"));
console.log("OK: grafo propio, tipos, evidencia, direcciones y moderación verificados.");
