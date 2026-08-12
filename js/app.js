
const $ = (s, root=document) => root.querySelector(s);
const $$ = (s, root=document) => [...root.querySelectorAll(s)];
const STORAGE_KEY = "simulacheck_v2_simulados";
const THEME_KEY = "simulacheck_v2_theme";

let currentQuestions = [];
let currentResult = null;
let chartGeneral = null, chartSubjects = null, chartHome = null;
let extractedSimuladoText = "";
let extractedGabaritoText = "";

const letters = ["A","B","C","D","E"];

function uuid(){ return crypto.randomUUID ? crypto.randomUUID() : Date.now()+"-"+Math.random().toString(16).slice(2); }
function saveAll(items){ localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); }
function getAll(){ try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||"[]")}catch{return[]} }
function fmtDate(iso){ return new Date(iso).toLocaleDateString("pt-BR",{day:"2-digit",month:"2-digit",year:"numeric"}); }
function pct(n,d){ return d ? Math.round((n/d)*100) : 0; }
function toast(msg){ const n=document.createElement("div"); n.className="toast"; n.textContent=msg; $("#toast-root").appendChild(n); setTimeout(()=>n.remove(),2800); }
function escapeHtml(value=""){ return String(value).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m])); }

function showScreen(id){
  $$(".screen").forEach(s=>s.classList.toggle("hidden",s.id!==id));
  window.scrollTo({top:0,behavior:"smooth"});
  if(id==="screen-home") renderHome();
}
function applyTheme(){
  const theme=localStorage.getItem(THEME_KEY)||"light";
  document.documentElement.dataset.theme=theme==="dark"?"dark":"";
  $("#theme-toggle").textContent=theme==="dark"?"☀️":"🌙";
}
function toggleTheme(){
  const next=(localStorage.getItem(THEME_KEY)||"light")==="dark"?"light":"dark";
  localStorage.setItem(THEME_KEY,next); applyTheme();
}

function blankQuestion(number){
  return {id:uuid(),number,answer:"",key:"",subject:"",topic:""};
}
function renderBuilder(){
  $("#question-count").textContent=currentQuestions.length;
  const root=$("#questions-builder");
  root.innerHTML="";
  currentQuestions.forEach(q=>{
    const card=document.createElement("div");
    card.className="question-row";
    card.dataset.id=q.id;
    card.innerHTML=`
      <div class="question-row-head">
        <span class="question-number">Questão ${q.number}</span>
        <button class="remove-question" type="button">Remover</button>
      </div>
      <div class="answer-grid">
        ${letters.map(l=>`<button type="button" data-type="answer" data-value="${l}" class="${q.answer===l?"active":""}">Minha ${l}</button>`).join("")}
      </div>
      <div class="answer-grid">
        ${letters.map(l=>`<button type="button" data-type="key" data-value="${l}" class="${q.key===l?"active":""}">Gabarito ${l}</button>`).join("")}
      </div>
      <div class="question-meta">
        <input type="text" data-field="subject" value="${escapeHtml(q.subject)}" placeholder="Matéria (ex.: Matemática)">
        <input type="text" data-field="topic" value="${escapeHtml(q.topic)}" placeholder="Assunto (ex.: Função)">
      </div>`;
    root.appendChild(card);
  });
}
function addQuestion(n){
  const next=n ?? (currentQuestions.length ? Math.max(...currentQuestions.map(q=>Number(q.number)||0))+1 : 1);
  currentQuestions.push(blankQuestion(next)); renderBuilder();
}

function normalizeLetters(text){
  return (text||"").toUpperCase().replace(/[ÁÀÃÂÄ]/g,"A").replace(/[ÉÈÊË]/g,"E").replace(/[ÍÌÎÏ]/g,"I").replace(/[ÓÒÕÔÖ]/g,"O").replace(/[ÚÙÛÜ]/g,"U");
}
function parseAnswerMap(text){
  const t=normalizeLetters(text);
  const map={};
  // 01-A, 01 A, 1) A, 1. A
  const pairRe=/(?:^|[\s;|])(\d{1,3})\s*[\)\.\-:]?\s*([ABCDE])\b/g;
  let m;
  while((m=pairRe.exec(t))) map[Number(m[1])]=m[2];
  return map;
}
function parseSequence(text){
  const t=normalizeLetters(text);
  const tokens=t.match(/\b[ABCDE]\b/g)||[];
  return tokens;
}
function buildQuestionsFromTexts(){
  const answers=parseAnswerMap($("#answers-text").value);
  const key=parseAnswerMap($("#key-text").value);
  const maxExplicit=Math.max(0,...Object.keys(answers).map(Number),...Object.keys(key).map(Number));
  const seqA=maxExplicit?[]:parseSequence($("#answers-text").value);
  const seqK=maxExplicit?[]:parseSequence($("#key-text").value);
  const count=Math.max(maxExplicit,seqA.length,seqK.length, currentQuestions.length);
  if(!count){ toast("Cole suas respostas/gabarito ou adicione uma questão."); return; }
  currentQuestions=Array.from({length:count},(_,i)=>{
    const n=i+1;
    return {id:uuid(),number:n,answer:answers[n]||seqA[i]||"",key:key[n]||seqK[i]||"",subject:"",topic:""};
  });
  renderBuilder();
  toast(`${count} questões preparadas.`);
}
function importTextIntoBuilder(){
  buildQuestionsFromTexts();
}
function summarizePdf(filename, text){
  return `${filename} — ${text.length.toLocaleString("pt-BR")} caracteres extraídos`;
}

async function extractPdf(file, target){
  if(!window.pdfjsLib){ toast("O leitor de PDF ainda está carregando. Tente novamente em alguns segundos."); return ""; }
  const data=await file.arrayBuffer();
  const pdf=await window.pdfjsLib.getDocument({data}).promise;
  let out="";
  for(let i=1;i<=pdf.numPages;i++){
    const page=await pdf.getPage(i);
    const content=await page.getTextContent();
    out += content.items.map(x=>x.str).join(" ") + "\n";
  }
  if(target==="simulado") extractedSimuladoText=out;
  else extractedGabaritoText=out;
  return out;
}

async function handlePdf(input,target){
  const file=input.files?.[0]; if(!file)return;
  const status=$("#pdf-"+target+"-status");
  status.textContent="Lendo PDF...";
  try{
    const text=await extractPdf(file,target);
    status.textContent=text? summarizePdf(file.name,text):"Não foi possível extrair texto.";
    if(text){
      $("#pdf-preview").classList.remove("hidden");
      $("#pdf-text-preview").textContent=text.slice(0,25000);
      if(target==="gabarito"){
        const map=parseAnswerMap(text);
        const seq=parseSequence(text);
        const count=Math.max(...Object.keys(map).map(Number),seq.length,0);
        if(count){
          const key=Object.keys(map).length?map:Object.fromEntries(seq.map((v,i)=>[i+1,v]));
          if(!currentQuestions.length) currentQuestions=Array.from({length:count},(_,i)=>blankQuestion(i+1));
          currentQuestions.forEach(q=>{ if(key[q.number]) q.key=key[q.number]; });
          renderBuilder();
          toast("Gabarito extraído e aplicado às questões.");
        }
      }
    }else{
      status.textContent="PDF sem texto selecionável. Pode ser um PDF escaneado.";
    }
  }catch(err){
    console.error(err); status.textContent="Erro ao ler o PDF."; toast("Não consegui ler esse PDF.");
  }
}

function calculate(questions){
  const ready=questions.filter(q=>q.answer && q.key);
  let correct=0;
  ready.forEach(q=>{q.isCorrect=q.answer===q.key;if(q.isCorrect)correct++;});
  const wrong=ready.length-correct;
  return {ready,correct,wrong,total:ready.length,percent:pct(correct,ready.length)};
}
function classifyMap(questions){
  const map={};
  questions.forEach(q=>{
    const subject=q.subject?.trim()||"Não classificada";
    if(!map[subject]) map[subject]={total:0,correct:0,wrong:0};
    map[subject].total++;
    if(q.isCorrect)map[subject].correct++; else map[subject].wrong++;
  });
  return map;
}
function topicMap(questions){
  const map={};
  questions.filter(q=>!q.isCorrect).forEach(q=>{
    const topic=q.topic?.trim()||"Assunto não informado";
    map[topic]=(map[topic]||0)+1;
  });
  return map;
}
function diagnostic(questions){
  const subject=classifyMap(questions);
  const arr=Object.entries(subject).filter(([k])=>k!=="Não classificada").map(([name,v])=>({name,...v,p:pct(v.correct,v.total)})).sort((a,b)=>a.p-b.p);
  const topic=Object.entries(topicMap(questions)).sort((a,b)=>b[1]-a[1]);
  const cards=[];
  if(arr[0]) cards.push(`<div class="diagnostic-card"><strong>⚠️ Matéria para priorizar: ${escapeHtml(arr[0].name)}</strong><p>${arr[0].p}% de aproveitamento (${arr[0].wrong} erros).</p></div>`);
  if(topic[0]) cards.push(`<div class="diagnostic-card"><strong>🎯 Assunto mais problemático: ${escapeHtml(topic[0][0])}</strong><p>${topic[0][1]} erro(s) nesse assunto.</p></div>`);
  if(questions.some(q=>!q.subject || !q.topic)) cards.push(`<div class="diagnostic-card"><strong>📝 Faltam classificações</strong><p>Algumas questões não têm matéria/assunto. Você pode editar isso no próximo cadastro.</p></div>`);
  if(!cards.length)cards.push(`<div class="diagnostic-card"><strong>✅ Bom diagnóstico</strong><p>O sistema não encontrou uma categoria claramente crítica. Continue acompanhando sua evolução.</p></div>`);
  return cards.join("");
}

function createCharts(result){
  if(!window.Chart)return;
  [chartGeneral,chartSubjects,chartHome].filter(Boolean).forEach(c=>c.destroy());
  const styles=getComputedStyle(document.documentElement);
  const textColor=styles.getPropertyValue("--text");
  const border=styles.getPropertyValue("--border");
  const subjects=classifyMap(result.questions);
  chartGeneral=new Chart($("#chart-result-general"),{
    type:"doughnut",
    data:{labels:["Acertos","Erros"],datasets:[{data:[result.correct,result.wrong],backgroundColor:["#16a34a","#dc2626"],borderWidth:0}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:"bottom",labels:{color:textColor}}}}
  });
  const entries=Object.entries(subjects).filter(([k])=>k!=="Não classificada");
  chartSubjects=new Chart($("#chart-subjects"),{
    type:"bar",
    data:{labels:entries.map(([k])=>k),datasets:[{label:"Aproveitamento (%)",data:entries.map(([,v])=>pct(v.correct,v.total)),backgroundColor:"#2563eb",borderRadius:8}]},
    options:{responsive:true,maintainAspectRatio:false,scales:{x:{ticks:{color:textColor},grid:{color:border}},y:{min:0,max:100,ticks:{color:textColor,callback:v=>v+"%"},grid:{color:border}}},plugins:{legend:{display:false}}}
  });
}

function renderHome(){
  const items=getAll();
  $("#home-total-simulados").textContent=items.length;
  $("#home-best").textContent=(items.length?Math.max(...items.map(x=>x.percent||0)):0)+"%";
  $("#home-average").textContent=(items.length?Math.round(items.reduce((s,x)=>s+(x.percent||0),0)/items.length):0)+"%";
  $("#home-total-questions").textContent=items.reduce((s,x)=>s+(x.total||0),0);
  const list=$("#history-list");
  list.innerHTML=items.slice().reverse().map(x=>`<div class="history-item">
    <div><strong>${escapeHtml(x.name)}</strong><div class="history-meta">${fmtDate(x.createdAt)} · ${x.correct}/${x.total} · ${x.percent}%</div></div>
    <button data-open="${x.id}">Abrir</button>
  </div>`).join("") || `<p class="empty">Nenhum simulado salvo ainda.</p>`;
  if(window.Chart){
    if(chartHome)chartHome.destroy();
    if(items.length){
      $("#home-chart-empty").classList.add("hidden");
      chartHome=new Chart($("#chart-home-evolution"),{
        type:"line",
        data:{labels:items.map(x=>new Date(x.createdAt).toLocaleDateString("pt-BR",{day:"2-digit",month:"2-digit"})),datasets:[{label:"Aproveitamento",data:items.map(x=>x.percent),borderColor:"#2563eb",backgroundColor:"rgba(37,99,235,.12)",fill:true,tension:.35}]},
        options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{min:0,max:100,ticks:{callback:v=>v+"%"}}}}
      });
    }else $("#home-chart-empty").classList.remove("hidden");
  }
}

function openResult(id){
  const item=getAll().find(x=>x.id===id); if(!item)return;
  currentResult=item;
  renderResult(item);
  showScreen("screen-dashboard");
}
function renderResult(r){
  $("#result-name").textContent=r.name;
  $("#result-date").textContent=`Criado em ${fmtDate(r.createdAt)}`;
  $("#result-total").textContent=r.total;
  $("#result-correct").textContent=r.correct;
  $("#result-wrong").textContent=r.wrong;
  $("#result-percent").textContent=r.percent+"%";
  $("#diagnostic-box").innerHTML=diagnostic(r.questions);
  const subject=classifyMap(r.questions);
  $("#subject-table").innerHTML=`<table class="data-table"><thead><tr><th>Matéria</th><th>Questões</th><th>Acertos</th><th>Erros</th><th>Aproveitamento</th></tr></thead><tbody>${Object.entries(subject).map(([name,v])=>`<tr><td>${escapeHtml(name)}</td><td>${v.total}</td><td>${v.correct}</td><td>${v.wrong}</td><td>${pct(v.correct,v.total)}%</td></tr>`).join("")}</tbody></table>`;
  const topic=Object.entries(topicMap(r.questions)).sort((a,b)=>b[1]-a[1]);
  $("#topic-ranking").innerHTML=topic.length?topic.map(([name,n],i)=>`<div class="topic-item"><strong>${i+1}. ${escapeHtml(name)}</strong><span>${n} erro(s)</span></div>`).join(""):`<p class="empty">Nenhum erro registrado.</p>`;
  $("#filter-subject").innerHTML=`<option value="all">Todas as matérias</option>`+Object.keys(subject).map(x=>`<option value="${escapeHtml(x)}">${escapeHtml(x)}</option>`).join("");
  renderResultQuestions();
  setTimeout(()=>createCharts(r),50);
}
function renderResultQuestions(){
  if(!currentResult)return;
  const status=$("#filter-status").value, subject=$("#filter-subject").value;
  const filtered=currentResult.questions.filter(q=>
    (status==="all" || (status==="correct"?q.isCorrect:!q.isCorrect)) &&
    (subject==="all" || (q.subject||"Não classificada")===subject)
  );
  $("#result-questions").innerHTML=filtered.map(q=>`<article class="result-question ${q.isCorrect?"correct":"wrong"}">
    <div class="rq-top"><strong>Questão ${q.number}</strong><span class="badge ${q.isCorrect?"correct":"wrong"}">${q.isCorrect?"✓ Correta":"✗ Errada"}</span></div>
    <div class="rq-main">
      <div><span>Sua resposta</span><strong>${q.answer||"—"}</strong></div>
      <div><span>Gabarito</span><strong>${q.key||"—"}</strong></div>
      <div><span>Matéria</span><strong>${escapeHtml(q.subject||"Não classificada")}</strong></div>
      <div><span>Assunto</span><strong>${escapeHtml(q.topic||"Não informado")}</strong></div>
    </div>
  </article>`).join("") || `<p class="empty">Nenhuma questão encontrada com esses filtros.</p>`;
}

function saveCurrent(){
  const name=$("#simulado-name").value.trim() || "Simulado sem nome";
  const data=calculate(currentQuestions);
  if(!data.ready.length){toast("Preencha pelo menos uma resposta e um gabarito.");return;}
  const item={
    id:uuid(),name,createdAt:new Date().toISOString(),
    total:data.total,correct:data.correct,wrong:data.wrong,percent:data.percent,
    questions:currentQuestions.map(q=>({...q}))
  };
  const all=getAll(); all.push(item); saveAll(all); currentResult=item; renderResult(item); showScreen("screen-dashboard");
  toast("Simulado corrigido e salvo.");
}
function loadExample(){
  const subjects=[
    ["Matemática","Função"],["Matemática","Probabilidade"],["Português","Interpretação"],["Biologia","Genética"],["História","República"],
    ["Física","Cinemática"],["Química","Estequiometria"],["Matemática","Geometria"],["Português","Gramática"],["Biologia","Ecologia"]
  ];
  const pattern=["A","B","C","D","E","A","B","C","D","E","A","C","C","B","E","D","A","B","C","D"];
  currentQuestions=Array.from({length:20},(_,i)=>{
    const key=pattern[i]; const wrong=i%4===0 ? letters[(letters.indexOf(key)+2)%5] : key;
    const [subject,topic]=subjects[i%subjects.length];
    return {id:uuid(),number:i+1,answer:wrong,key,subject,topic,isCorrect:wrong===key};
  });
  $("#simulado-name").value="Simulado de exemplo";
  renderBuilder(); showScreen("screen-form"); toast("Exemplo carregado.");
}

function startNew(){
  currentQuestions=[]; extractedSimuladoText=""; extractedGabaritoText="";
  $("#simulado-name").value=""; $("#answers-text").value=""; $("#key-text").value="";
  $("#pdf-simulado").value=""; $("#pdf-gabarito").value="";
  $("#pdf-simulado-status").textContent="Nenhum arquivo selecionado.";
  $("#pdf-gabarito-status").textContent="Nenhum arquivo selecionado.";
  $("#pdf-preview").classList.add("hidden"); renderBuilder(); addQuestion(1); addQuestion(2); addQuestion(3);
  showScreen("screen-form");
}

document.addEventListener("click",e=>{
  const el=e.target.closest("[data-go]"); if(el)showScreen(el.dataset.go);
  if(e.target.closest("#go-home"))showScreen("screen-home");
  if(e.target.closest("#theme-toggle"))toggleTheme();
  if(e.target.closest("#btn-new"))startNew();
  if(e.target.closest("#btn-example"))loadExample();
  if(e.target.closest("#btn-add-question"))addQuestion();
  if(e.target.closest("#btn-generate-questions"))importTextIntoBuilder();
  if(e.target.closest("#close-pdf-preview"))$("#pdf-preview").classList.add("hidden");
  const hist=e.target.closest("[data-open]"); if(hist)openResult(hist.dataset.open);
  const row=e.target.closest(".question-row");
  if(row){
    const q=currentQuestions.find(x=>x.id===row.dataset.id);
    if(e.target.matches("[data-type]")){q[e.target.dataset.type==="answer"?"answer":"key"]=e.target.dataset.value;renderBuilder();}
    if(e.target.matches(".remove-question")){currentQuestions=currentQuestions.filter(x=>x.id!==row.dataset.id);renumber();renderBuilder();}
  }
  if(e.target.closest("#btn-correct"))saveCurrent();
  if(e.target.closest("#back-dashboard-home"))showScreen("screen-home");
  if(e.target.closest("#btn-print"))window.print();
  if(e.target.closest("#btn-delete-result") && currentResult){
    if(confirm("Excluir este simulado do histórico?")){
      saveAll(getAll().filter(x=>x.id!==currentResult.id)); currentResult=null; showScreen("screen-home"); toast("Simulado excluído.");
    }
  }
});
function renumber(){currentQuestions.forEach((q,i)=>q.number=i+1)}
document.addEventListener("input",e=>{
  const row=e.target.closest(".question-row"); if(!row)return;
  const q=currentQuestions.find(x=>x.id===row.dataset.id); const field=e.target.dataset.field;
  if(q&&field)q[field]=e.target.value;
});
$("#pdf-simulado").addEventListener("change",e=>handlePdf(e.target,"simulado"));
$("#pdf-gabarito").addEventListener("change",e=>handlePdf(e.target,"gabarito"));
$("#filter-status").addEventListener("change",renderResultQuestions);
$("#filter-subject").addEventListener("change",renderResultQuestions);

applyTheme();
renderBuilder();
renderHome();
