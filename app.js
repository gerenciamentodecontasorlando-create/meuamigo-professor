/* ANDY PRO — PDF REAL (jsPDF + AutoTable)
   - Resolve PDF branco ao compartilhar (sem window.print)
   - Gera arquivo PDF de verdade
   - Tenta compartilhar via Web Share (com arquivo). Se não der, baixa.
*/

const CRITS = [
  { key: "aciduidade", label: "Aciduidade" },
  { key: "conhecimento_previo", label: "Conhecimento prévio" },
  { key: "postura", label: "Postura" },
  { key: "proatividade", label: "Proatividade" },
  { key: "socializacao", label: "Socialização" },
  { key: "expressividade", label: "Expressividade" },
];

const STORAGE_KEY = "ANDY_PRO_V3_REALPDF";
const $ = (id) => document.getElementById(id);

function hojeISO() {
  const d = new Date();
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d - tz).toISOString().slice(0, 10);
}
function uid(){ return Math.random().toString(16).slice(2) + Date.now().toString(16); }

function cycle(v){
  if (v === null || v === undefined) return 0;
  if (v === 0) return 3;
  if (v === 3) return 5;
  return null;
}

function defaultNotas(){ return Object.fromEntries(CRITS.map(c => [c.key, null])); }
function defaultRegistroDia(){
  return {
    presenca: "Presente",
    reposicao: "Não",
    repData: "",
    obs: "",
    notas: defaultNotas(),
    feedback: { fortes: "", melhorar: "", estudar: "", msg: "" },
    repStatus: "pendente"
  };
}
function defaultCaso(){ return { qp:"", hda:"", achados:"", hipoteses:"", conduta:"" }; }

let state = {
  preceptor: { nome: "", tel: "", disc: "Clínica Integrada", local: "", grupo: "" },
  alunos: [],
  dias: {},
  selecionado: null
};

function diaKey(){ return $("dia").value || hojeISO(); }

function ensureDia(){
  const k = diaKey();
  if (!state.dias[k]) state.dias[k] = { registros: {}, caso: defaultCaso() };
  state.alunos.forEach(a => {
    if (!state.dias[k].registros[a.id]) state.dias[k].registros[a.id] = defaultRegistroDia();
  });
}

function getReg(alunoId){
  ensureDia();
  const k = diaKey();
  if (!state.dias[k].registros[alunoId]) state.dias[k].registros[alunoId] = defaultRegistroDia();
  return state.dias[k].registros[alunoId];
}
function getCaso(){ ensureDia(); return state.dias[diaKey()].caso; }

function score(notas){
  const vals = Object.values(notas||{}).filter(v => typeof v === "number");
  const max = CRITS.length * 5;
  if (!vals.length) return { sum:null, max, nota10:null };
  const sum = vals.reduce((a,b)=>a+b,0);
  const nota10 = Math.round(((sum/max)*10)*10)/10;
  return { sum, max, nota10 };
}

function save(){
  state.preceptor = {
    nome: $("prof_nome").value || "",
    tel: $("prof_tel").value || "",
    disc: $("prof_disc").value || "",
    local: $("prof_local").value || "",
    grupo: $("prof_grupo").value || "",
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
function load(){
  const raw = localStorage.getItem(STORAGE_KEY);
  if(raw){
    try{ state = JSON.parse(raw); }catch(e){}
  }
  state.preceptor ||= { nome:"", tel:"", disc:"Clínica Integrada", local:"", grupo:"" };
  state.alunos ||= [];
  state.dias ||= {};
  state.selecionado ||= null;

  $("dia").value = $("dia").value || hojeISO();

  $("prof_nome").value = state.preceptor.nome || "";
  $("prof_tel").value = state.preceptor.tel || "";
  $("prof_disc").value = state.preceptor.disc || "Clínica Integrada";
  $("prof_local").value = state.preceptor.local || "";
  $("prof_grupo").value = state.preceptor.grupo || "";

  ensureDia();
  if(!state.selecionado && state.alunos.length) state.selecionado = state.alunos[0].id;

  renderAll();
}

function renderAll(){
  ensureDia();
  renderListaAlunos();
  renderTabelaRapida();
  renderCriteriosCard();
  renderCartaoAluno();
  renderFilaReposicoes();
  renderCaso();
  save();
}

function renderListaAlunos(){
  const wrap = $("listaAlunos");
  wrap.innerHTML = "";
  if(!state.alunos.length){
    wrap.innerHTML = `<div class="hint">Sem alunos. Clique em “+ Novo aluno”.</div>`;
    return;
  }
  state.alunos.forEach(a=>{
    const r = getReg(a.id);
    const sc = score(r.notas);
    const notaTxt = sc.nota10==null ? "—" : sc.nota10;
    const btn = document.createElement("button");
    btn.className = (state.selecionado===a.id) ? "active" : "";
    btn.innerHTML = `<b>${a.nome}</b><div class="sub">Mat: ${a.mat||"—"} • ${r.presenca} • Nota: ${notaTxt}</div>`;
    btn.onclick = ()=>{ state.selecionado=a.id; renderAll(); };
    wrap.appendChild(btn);
  });
}

function renderTabelaRapida(){
  const tb = $("tabelaRapida");
  if(!state.alunos.length){
    tb.innerHTML = `<tr><td style="padding:14px;color:#607D8B">Cadastre alunos para usar o modo rápido.</td></tr>`;
    return;
  }

  const head = `
    <tr>
      <th>Aluno</th>
      <th>Presença</th>
      ${CRITS.map(c=>`<th>${c.label}</th>`).join("")}
      <th>Obs curta</th>
      <th>Reposição</th>
    </tr>`;

  const rows = state.alunos.map(a=>{
    const r = getReg(a.id);
    const cells = CRITS.map(c=>{
      const v = r.notas[c.key];
      const cls = (v==null) ? "v" : (v===0?"n0":(v===3?"n3":"n5"));
      const txt = (v==null) ? "—" : v;
      return `<td class="cellTap ${cls}" onclick="toggleNota('${a.id}','${c.key}')">${txt}</td>`;
    }).join("");

    return `
      <tr>
        <td>
          <b style="cursor:pointer" onclick="selectAluno('${a.id}')">${a.nome}</b><br/>
          <span style="color:#607D8B;font-size:12px">Mat: ${a.mat||"—"}</span>
        </td>
        <td>
          <select onchange="setPresenca('${a.id}', this.value)">
            ${["Presente","Atraso","Falta"].map(p=>`<option ${r.presenca===p?"selected":""}>${p}</option>`).join("")}
          </select>
        </td>
        ${cells}
        <td>
          <input value="${(r.obs||"").replace(/"/g,'&quot;')}" placeholder="ex.: revisar SOAP" oninput="setObs('${a.id}', this.value)" />
        </td>
        <td>
          <select onchange="setReposicao('${a.id}', this.value)">
            <option ${r.reposicao==="Não"?"selected":""}>Não</option>
            <option ${r.reposicao==="Sim"?"selected":""}>Sim</option>
          </select>
        </td>
      </tr>
    `;
  }).join("");

  tb.innerHTML = head + rows;
}

function renderCriteriosCard(){
  const wrap = $("criterios");
  wrap.innerHTML = "";
  if(!state.selecionado) return;
  const r = getReg(state.selecionado);

  CRITS.forEach(c=>{
    const v = r.notas[c.key];
    const row = document.createElement("div");
    row.className="crit";
    row.innerHTML = `
      <b>${c.label}</b>
      <div class="critBtns">
        <button class="pbtn ${v===0?"active":""}" onclick="setNotaCard('${c.key}',0)">0</button>
        <button class="pbtn ${v===3?"active":""}" onclick="setNotaCard('${c.key}',3)">3</button>
        <button class="pbtn ${v===5?"active":""}" onclick="setNotaCard('${c.key}',5)">5</button>
      </div>
    `;
    wrap.appendChild(row);
  });
}

function renderCartaoAluno(){
  const tag = $("alunoTag");
  if(!state.selecionado){
    tag.textContent="Selecione um aluno";
    return;
  }
  const a = state.alunos.find(x=>x.id===state.selecionado);
  const r = getReg(state.selecionado);

  tag.textContent = `Selecionado: ${a?.nome || "Aluno"}`;

  $("al_nome").value = a?.nome || "";
  $("al_mat").value = a?.mat || "";
  $("al_tel").value = a?.tel || "";

  $("al_presenca").value = r.presenca || "Presente";
  $("al_reposicao").value = r.reposicao || "Não";
  $("al_repdata").value = r.repData || "";
  $("al_obs").value = r.obs || "";

  $("fb_fortes").value = r.feedback?.fortes || "";
  $("fb_melhorar").value = r.feedback?.melhorar || "";
  $("fb_estudar").value = r.feedback?.estudar || "";
  $("fb_msg").value = r.feedback?.msg || "";

  const sc = score(r.notas);
  $("scoreBox").textContent = (sc.sum==null) ? "—" : `${sc.sum}/${sc.max}`;
  $("notaBox").textContent  = (sc.nota10==null) ? "—" : `${sc.nota10}`;
}

function renderFilaReposicoes(){
  const wrap = $("filaReposicoes");
  wrap.innerHTML = "";
  if(!state.alunos.length){
    wrap.innerHTML = `<div class="hint">Cadastre alunos para aparecer reposições.</div>`;
    return;
  }

  const fila=[];
  state.alunos.forEach(a=>{
    const r = getReg(a.id);
    const precisa = (r.presenca==="Falta") || (r.reposicao==="Sim");
    if(precisa) fila.push({id:a.id, nome:a.nome, mat:a.mat||"", repData:r.repData||"", status:r.repStatus||"pendente"});
  });

  if(!fila.length){
    wrap.innerHTML = `<div class="hint">Sem reposições pendentes no dia ✅</div>`;
    return;
  }

  fila.forEach(item=>{
    const div=document.createElement("div");
    div.className="repItem";
    div.innerHTML = `
      <div>
        <b>${item.nome}</b>
        <div class="meta">Mat: ${item.mat||"—"} • Prev: ${item.repData||"—"}</div>
      </div>
      <div style="display:flex;gap:8px;align-items:center;">
        <span class="tag ${item.status==="feita"?"feita":"pendente"}">${item.status==="feita"?"Feita":"Pendente"}</span>
        <button class="btn ghost" onclick="toggleRep('${item.id}')">Alternar</button>
      </div>
    `;
    wrap.appendChild(div);
  });
}

function renderCaso(){
  const c=getCaso();
  $("caso_qp").value = c.qp||"";
  $("caso_hda").value = c.hda||"";
  $("caso_achados").value = c.achados||"";
  $("caso_hipoteses").value = c.hipoteses||"";
  $("caso_conduta").value = c.conduta||"";
}

/* ações */
window.selectAluno = (id)=>{ state.selecionado=id; renderAll(); };
window.toggleNota = (alunoId, key)=>{ const r=getReg(alunoId); r.notas[key]=cycle(r.notas[key]); renderAll(); };
window.setPresenca = (alunoId, val)=>{ const r=getReg(alunoId); r.presenca=val; if(val==="Falta") r.reposicao="Sim"; renderAll(); };
window.setReposicao = (alunoId, val)=>{ const r=getReg(alunoId); r.reposicao=val; renderAll(); };
window.setObs = (alunoId, val)=>{ const r=getReg(alunoId); r.obs=val; save(); };
window.setNotaCard = (key, val)=>{ if(!state.selecionado) return; const r=getReg(state.selecionado); r.notas[key]=val; renderAll(); };
window.toggleRep = (alunoId)=>{ const r=getReg(alunoId); r.repStatus = (r.repStatus==="feita")?"pendente":"feita"; renderAll(); };

/* alunos */
function novoAluno(nomeDefault){
  if(state.alunos.length>=6) return alert("Máximo de 6 alunos.");
  const a = { id:uid(), nome:nomeDefault || `Aluno ${state.alunos.length+1}`, mat:"", tel:"" };
  state.alunos.push(a);
  ensureDia();
  state.selecionado=a.id;
  renderAll();
}
function preencher6(){ while(state.alunos.length<6) novoAluno(`Aluno ${state.alunos.length+1}`); }
function limparDia(){
  if(!confirm("Limpar notas/obs do DIA atual (não apaga outros dias)?")) return;
  ensureDia();
  const k=diaKey();
  state.alunos.forEach(a=> state.dias[k].registros[a.id]=defaultRegistroDia());
  renderAll();
}

/* salvar aluno */
function autosaveAluno(){
  if(!state.selecionado) return;
  const a=state.alunos.find(x=>x.id===state.selecionado);
  const r=getReg(state.selecionado);

  a.nome = $("al_nome").value || a.nome;
  a.mat  = $("al_mat").value || "";
  a.tel  = $("al_tel").value || "";

  r.presenca  = $("al_presenca").value;
  r.reposicao = $("al_reposicao").value;
  r.repData   = $("al_repdata").value || "";
  r.obs       = $("al_obs").value || "";

  r.feedback = {
    fortes: $("fb_fortes").value || "",
    melhorar: $("fb_melhorar").value || "",
    estudar: $("fb_estudar").value || "",
    msg: $("fb_msg").value || ""
  };

  if(r.presenca==="Falta") r.reposicao="Sim";
  save();
}

function salvarAluno(){
  autosaveAluno();
  renderAll();
  alert("Aluno salvo ✅");
}

/* caso */
function salvarCaso(){
  const c=getCaso();
  c.qp = $("caso_qp").value||"";
  c.hda = $("caso_hda").value||"";
  c.achados = $("caso_achados").value||"";
  c.hipoteses = $("caso_hipoteses").value||"";
  c.conduta = $("caso_conduta").value||"";
  save();
}
function limparCaso(){
  if(!confirm("Limpar o caso do dia?")) return;
  const c=getCaso();
  c.qp=c.hda=c.achados=c.hipoteses=c.conduta="";
  renderAll(); save();
}

/* feedback gerador simples */
function gerarFeedback(modo){
  if(!state.selecionado) return alert("Selecione um aluno.");
  const fortes = ($("fb_fortes").value||"—").trim();
  const melhorar = ($("fb_melhorar").value||"—").trim();
  const estudar = ($("fb_estudar").value||"—").trim();

  let intro="", fim="";
  if(modo==="encorajador"){ intro="Você está evoluindo. Vamos acelerar tua curva com segurança."; fim="Segue firme — constância dá resultado."; }
  else if(modo==="direto"){ intro="Feedback objetivo da prática:"; fim="Aplique isso na próxima prática e a gente revisa."; }
  else { intro="Feedback orientador do dia:"; fim="O foco é evolução, sem pressão desnecessária."; }

  $("fb_msg").value =
`${intro}

✅ Pontos fortes:
- ${fortes}

🔧 Pontos a melhorar:
- ${melhorar}

📚 O que estudar / ação prática:
- ${estudar}

🤝 Mensagem:
${fim}`;

  autosaveAluno();
  alert("Feedback gerado ✅");
}

/* modal histórico (igual ao anterior, resumido) */
function abrirHistorico(){
  if(!state.selecionado) return alert("Selecione um aluno.");
  const a=state.alunos.find(x=>x.id===state.selecionado);

  const regs=[];
  Object.keys(state.dias).sort().forEach(d=>{
    const reg=state.dias[d]?.registros?.[a.id];
    if(!reg) return;
    const sc=score(reg.notas);
    const precisa=(reg.presenca==="Falta")||(reg.reposicao==="Sim");
    regs.push({data:d,presenca:reg.presenca,nota:sc.nota10,obs:reg.obs||"",rep:precisa?`${reg.repStatus||"pendente"} / ${reg.repData||"—"}`:"—"});
  });

  $("modalTitle").textContent = `Histórico — ${a.nome}`;
  $("modalBody").innerHTML = regs.length ? `
    <table style="width:100%;border-collapse:collapse;font-size:13px;">
      <thead>
        <tr style="background:#E3F2FD;color:#1E88E5;">
          <th style="border:1px solid #cfd8dc;padding:8px;">Data</th>
          <th style="border:1px solid #cfd8dc;padding:8px;">Presença</th>
          <th style="border:1px solid #cfd8dc;padding:8px;">Nota</th>
          <th style="border:1px solid #cfd8dc;padding:8px;">Obs</th>
          <th style="border:1px solid #cfd8dc;padding:8px;">Reposição</th>
        </tr>
      </thead>
      <tbody>
        ${regs.map(r=>`
          <tr>
            <td style="border:1px solid #cfd8dc;padding:8px;">${r.data}</td>
            <td style="border:1px solid #cfd8dc;padding:8px;">${r.presenca}</td>
            <td style="border:1px solid #cfd8dc;padding:8px;">${r.nota==null?"—":r.nota}</td>
            <td style="border:1px solid #cfd8dc;padding:8px;">${r.obs}</td>
            <td style="border:1px solid #cfd8dc;padding:8px;">${r.rep}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  ` : `<div style="color:#607D8B;">Sem histórico ainda.</div>`;

  $("modal").classList.add("show");
}
function fecharModal(){ $("modal").classList.remove("show"); }

/* =========================
   ✅ PDF REAL (não dá branco)
========================= */
function getDoc(){
  const { jsPDF } = window.jspdf;
  return new jsPDF({ unit:"pt", format:"a4" });
}

function drawHeader(doc, titulo){
  // cores
  const azul = [30,136,229];

  // borda externa arredondada (simulada)
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  doc.setDrawColor(...azul);
  doc.setLineWidth(2);
  doc.roundedRect(28, 28, w-56, h-56, 14, 14);

  // Logo ANDY (A + NDY)
  doc.setFillColor(227,242,253);
  doc.setDrawColor(30,136,229);
  doc.roundedRect(44, 44, 56, 56, 16, 16, "FD");
  doc.setTextColor(...azul);
  doc.setFont("helvetica","bold");
  doc.setFontSize(24);
  doc.text("A", 72, 80, { align:"center" });

  doc.setFontSize(18);
  doc.text("NDY", 118, 78);

  // Título
  doc.setFontSize(14);
  doc.setTextColor(...azul);
  doc.text("ANDY PRO", w/2, 66, { align:"center" });
  doc.setFontSize(12);
  doc.setTextColor(96,125,139);
  doc.text(titulo, w/2, 84, { align:"center" });

  // caixa preceptor
  const p = state.preceptor;
  doc.setDrawColor(207,216,220);
  doc.setLineWidth(1);
  doc.roundedRect(44, 110, w-88, 70, 12, 12);

  doc.setFontSize(12);
  doc.setTextColor(38,50,56);
  doc.setFont("helvetica","normal");

  const line1 = `Preceptor: ${p.nome||"—"}   |   Tel: ${p.tel||"—"}   |   Data: ${diaKey()}`;
  const line2 = `Disciplina: ${p.disc||"—"}   |   Local: ${p.local||"—"}   |   Grupo: ${p.grupo||"—"}`;

  doc.text(line1, w/2, 140, { align:"center" });
  doc.text(line2, w/2, 162, { align:"center" });

  return 200; // y inicial do conteúdo
}

function addBox(doc, y, title, text){
  const w = doc.internal.pageSize.getWidth();
  doc.setDrawColor(207,216,220);
  doc.roundedRect(44, y, w-88, 90, 12, 12);
  doc.setFont("helvetica","bold");
  doc.setTextColor(30,136,229);
  doc.setFontSize(12);
  doc.text(title, w/2, y+20, { align:"center" });

  doc.setFont("helvetica","normal");
  doc.setTextColor(38,50,56);
  doc.setFontSize(12);

  const lines = doc.splitTextToSize(text || "—", w-110);
  doc.text(lines, 60, y+42);
  return y + 110;
}

async function shareOrDownload(pdfBytes, filename){
  const blob = new Blob([pdfBytes], { type:"application/pdf" });
  const file = new File([blob], filename, { type:"application/pdf" });

  // tentar compartilhar como arquivo
  if (navigator.canShare && navigator.canShare({ files:[file] })) {
    await navigator.share({ files:[file], title:"ANDY PDF", text:"Relatório gerado pelo ANDY." });
    return;
  }

  // fallback: download
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(()=>URL.revokeObjectURL(url), 2000);
}

async function gerarPDFDia(){
  autosaveAluno();
  salvarCaso();
  save();
  ensureDia();

  const doc = getDoc();
  let y = drawHeader(doc, "Relatório do Dia");

  // tabela
  const head = [
    ["Aluno", "Presença", ...CRITS.map(c=>c.label), "Nota(0–10)", "Obs", "Reposição", "Prevista"]
  ];

  const body = state.alunos.map(a=>{
    const r = getReg(a.id);
    const sc = score(r.notas);
    const precisa = (r.presenca==="Falta") || (r.reposicao==="Sim");

    return [
      `${a.nome}\nMat: ${a.mat||"—"}\nTel: ${a.tel||"—"}`,
      r.presenca,
      ...CRITS.map(c => (r.notas[c.key]==null ? "—" : String(r.notas[c.key]))),
      sc.nota10==null ? "—" : String(sc.nota10),
      r.obs || "",
      precisa ? (r.repStatus||"pendente") : "—",
      precisa ? (r.repData||"—") : "—",
    ];
  });

  doc.autoTable({
    startY: y,
    head,
    body,
    styles: { font:"helvetica", fontSize:10, cellPadding:6, valign:"top" },
    headStyles: { fillColor:[227,242,253], textColor:[30,136,229], fontStyle:"bold" },
    theme: "grid",
    margin: { left:44, right:44 },
  });

  y = doc.lastAutoTable.finalY + 14;

  // caso clínico
  const c = getCaso();
  const casoTxt =
`Queixa principal: ${c.qp||"—"}

História/contexto: ${c.hda||"—"}

Achados relevantes: ${c.achados||"—"}

Hipóteses/diferenciais: ${c.hipoteses||"—"}

Conduta/pontos de estudo: ${c.conduta||"—"}`;

  if (c.qp || c.hda || c.achados || c.hipoteses || c.conduta) {
    // se não couber na página, jsPDF faz paginação manual: simples
    if (y > 640) { doc.addPage(); y = 60; }
    y = addBox(doc, y, "Caso clínico do dia (anonimizado)", casoTxt);
  }

  const bytes = doc.output("arraybuffer");
  await shareOrDownload(bytes, `ANDY_Relatorio_Dia_${diaKey()}.pdf`);
}

async function gerarPDFAluno(){
  autosaveAluno();
  salvarCaso();
  save();
  ensureDia();

  if(!state.selecionado) return alert("Selecione um aluno.");

  const a = state.alunos.find(x=>x.id===state.selecionado);
  const r = getReg(state.selecionado);
  const sc = score(r.notas);
  const precisa = (r.presenca==="Falta") || (r.reposicao==="Sim");

  const doc = getDoc();
  let y = drawHeader(doc, "Relatório do Aluno");

  y = addBox(doc, y, "Identificação do aluno",
`Nome: ${a.nome}
Matrícula: ${a.mat||"—"}
Telefone: ${a.tel||"—"}

Presença: ${r.presenca}
Reposição: ${precisa ? (r.repStatus||"pendente") : "—"}
Prevista: ${precisa ? (r.repData||"—") : "—"}

Observação curta: ${r.obs||"—"}`);

  // tabela de notas
  const head = [["Critério", "Nota"]];
  const body = CRITS.map(c=>[c.label, (r.notas[c.key]==null?"—":String(r.notas[c.key]))]);
  body.push(["Nota sugerida (0–10)", sc.nota10==null?"—":String(sc.nota10)]);

  doc.autoTable({
    startY: y,
    head,
    body,
    styles: { font:"helvetica", fontSize:11, cellPadding:6 },
    headStyles: { fillColor:[227,242,253], textColor:[30,136,229], fontStyle:"bold" },
    theme:"grid",
    margin:{ left:44, right:44 }
  });

  y = doc.lastAutoTable.finalY + 14;

  // feedback
  const fbTxt =
`Pontos fortes:
${r.feedback?.fortes || "—"}

Pontos a melhorar:
${r.feedback?.melhorar || "—"}

O que estudar / ação prática:
${r.feedback?.estudar || "—"}

Mensagem:
${r.feedback?.msg || "—"}`;

  if (y > 640) { doc.addPage(); y = 60; }
  y = addBox(doc, y, "Feedback pedagógico", fbTxt);

  // caso
  const c = getCaso();
  const casoTxt =
`Queixa principal: ${c.qp||"—"}

História/contexto: ${c.hda||"—"}

Achados relevantes: ${c.achados||"—"}

Hipóteses/diferenciais: ${c.hipoteses||"—"}

Conduta/pontos de estudo: ${c.conduta||"—"}`;

  if (c.qp || c.hda || c.achados || c.hipoteses || c.conduta) {
    if (y > 620) { doc.addPage(); y = 60; }
    y = addBox(doc, y, "Caso clínico do dia (anonimizado)", casoTxt);
  }

  const bytes = doc.output("arraybuffer");
  await shareOrDownload(bytes, `ANDY_Relatorio_Aluno_${a.nome.replace(/\s+/g,"_")}_${diaKey()}.pdf`);
}

/* botões / eventos */
function wire(){
  $("dia").value = $("dia").value || hojeISO();

  $("btnHoje").onclick = ()=>{ $("dia").value=hojeISO(); renderAll(); };

  $("btnPDFDia").onclick = ()=>gerarPDFDia();
  $("btnPDFDia2").onclick = ()=>gerarPDFDia();
  $("btnPDFAluno").onclick = ()=>gerarPDFAluno();
  $("btnPDFAluno2").onclick = ()=>gerarPDFAluno();

  $("btnSalvarTudo").onclick = ()=>{ autosaveAluno(); salvarCaso(); save(); alert("Salvo ✅"); };
  $("btnSalvarTudo2").onclick = ()=>{ autosaveAluno(); salvarCaso(); save(); alert("Salvo ✅"); };

  $("btnNovoAluno").onclick = ()=>novoAluno();
  $("btnFixar6").onclick = ()=>preencher6();
  $("btnLimparDia").onclick = ()=>limparDia();

  $("btnSalvarAluno").onclick = ()=>salvarAluno();

  $("btnVerHistorico").onclick = ()=>abrirHistorico();
  $("btnFecharModal").onclick = ()=>fecharModal();
  $("modal").onclick = (e)=>{ if(e.target.id==="modal") fecharModal(); };

  $("btnFBNeutro").onclick = ()=>gerarFeedback("neutro");
  $("btnFBEnc").onclick = ()=>gerarFeedback("encorajador");
  $("btnFBDireto").onclick = ()=>gerarFeedback("direto");

  $("btnLimparCaso").onclick = ()=>limparCaso();

  ["prof_nome","prof_tel","prof_disc","prof_local","prof_grupo"].forEach(id=>$(id).addEventListener("input", ()=>save()));
  $("dia").addEventListener("change", ()=>renderAll());

  ["al_nome","al_mat","al_tel","al_presenca","al_reposicao","al_repdata","al_obs","fb_fortes","fb_melhorar","fb_estudar","fb_msg"]
    .forEach(id=>{
      $(id).addEventListener("input", ()=>autosaveAluno());
      $(id).addEventListener("change", ()=>autosaveAluno());
    });

  ["caso_qp","caso_hda","caso_achados","caso_hipoteses","caso_conduta"]
    .forEach(id=>$(id).addEventListener("input", ()=>salvarCaso()));

  if("serviceWorker" in navigator){
    navigator.serviceWorker.register("./service-worker.js").catch(()=>{});
  }
}

(function init(){ wire(); load(); })();
