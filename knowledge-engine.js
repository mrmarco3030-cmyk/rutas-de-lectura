(function(root,factory){const api=factory();if(typeof module!=="undefined"&&module.exports)module.exports=api;else root.KnowledgeEngine=api})(typeof window!=="undefined"?window:globalThis,function(){
  "use strict";
  const normalize=value=>(value??"").toString().normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
  function matchesRef(book,ref){
    if(!book||!ref)return false;
    if(ref.localId&&book.localId===ref.localId)return true;
    if(ref.googleId&&book.googleId===ref.googleId)return true;
    if(ref.openKey&&book.openKey===ref.openKey)return true;
    if(ref.isbn&&(book.isbns||[]).includes(ref.isbn))return true;
    return Boolean(ref.title&&normalize(book.title)===normalize(ref.title)&&(!ref.author||(book.authors||[]).some(a=>normalize(a)===normalize(ref.author))));
  }
  function validateRelation(relation,typeIds){
    const errors=[];
    if(!relation?.id)errors.push("id");if(!typeIds.has(relation?.type))errors.push("type");if(!relation?.from)errors.push("from");if(!relation?.to)errors.push("to");
    if(!relation?.explanation)errors.push("explanation");if(!relation?.contribution)errors.push("contribution");if(!relation?.themes?.length)errors.push("themes");
    if(!relation?.evidence?.claims?.length)errors.push("evidence.claims");if(!relation?.evidence?.sources?.length)errors.push("evidence.sources");
    if(!["approved","proposed","rejected"].includes(relation?.status))errors.push("status");
    return {valid:errors.length===0,errors};
  }
  function create(document={}){
    const types=new Map((document.relationTypes||[]).map(t=>[t.id,t]));
    const relations=new Map();
    const providers=new Map();
    function ingest(items,provider="manual"){
      const accepted=[],rejected=[];
      for(const item of items||[]){const relation={...item,provenance:{provider,...item.provenance}};const check=validateRelation(relation,new Set(types.keys()));if(check.valid){relations.set(relation.id,relation);accepted.push(relation)}else rejected.push({relation,errors:check.errors})}
      return {accepted,rejected};
    }
    ingest(document.relations||[],"curated-seed");
    return {
      schemaVersion:document.schemaVersion||1,
      relationTypes:[...types.values()],
      ingest,
      registerProvider(provider){if(!provider?.id||typeof provider.load!=="function")throw new Error("Proveedor inválido");providers.set(provider.id,provider)},
      async syncProviders(){const reports=[];for(const provider of providers.values())reports.push({provider:provider.id,...ingest(await provider.load(),provider.id)});return reports},
      propose(input,provenance={provider:"user"}){const relation={...input,status:"proposed",provenance:{...provenance,createdAt:provenance.createdAt||new Date().toISOString()}};const check=validateRelation(relation,new Set(types.keys()));if(!check.valid)throw new Error(`Relación inválida: ${check.errors.join(", ")}`);relations.set(relation.id,relation);return relation},
      themesFor(book,{statuses=["approved"]}={}){const themes=[];for(const relation of relations.values()){if(!statuses.includes(relation.status))continue;if(matchesRef(book,relation.from)||(relation.direction==="bidirectional"&&matchesRef(book,relation.to)))themes.push(...relation.themes)}return [...new Set(themes)]},
      find(book,{theme="",objective="ampliar",statuses=["approved"]}={}){
        const allowed=new Set([...types.values()].filter(type=>(type.objectives||[]).includes(objective)).map(type=>type.id)),wanted=normalize(theme),out=[];
        for(const relation of relations.values()){
          if(!statuses.includes(relation.status)||!allowed.has(relation.type))continue;
          let target=null,direction="forward";
          if(matchesRef(book,relation.from))target=relation.to;
          else if(relation.direction==="bidirectional"&&matchesRef(book,relation.to)){target=relation.from;direction="reverse"}
          if(!target)continue;
          const matchedThemes=(relation.themes||[]).filter(t=>!wanted||normalize(t).includes(wanted)||wanted.includes(normalize(t)));
          if(objective!=="autor"&&wanted&&!matchedThemes.length)continue;
          out.push({relation,target,direction,matchedThemes,relationType:types.get(relation.type)});
        }
        return out.sort((a,b)=>(b.relation.confidence||0)-(a.relation.confidence||0));
      },
      export({statuses=["approved","proposed"]}={}){return {schemaVersion:document.schemaVersion||1,relationTypes:[...types.values()],relations:[...relations.values()].filter(r=>statuses.includes(r.status))}},
      validate:relation=>validateRelation(relation,new Set(types.keys())),matchesRef
    };
  }
  return {create,normalize,matchesRef,validateRelation};
});
