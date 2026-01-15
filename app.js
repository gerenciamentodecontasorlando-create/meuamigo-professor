/* ANDY PRO — app.js
   PDF bonito: fonte 12, bordas completas, cantos arredondados, logo em destaque, layout organizado.
*/

const CRITS = [
  { key: "aciduidade", label: "Aciduidade" },
  { key: "conhecimento_previo", label: "Conhecimento prévio" },
  { key: "postura", label: "Postura" },
  { key: "proatividade", label: "Proatividade" },
  { key: "socializacao", label: "Socialização" },
  { key: "expressividade", label: "Expressividade" },
];

const STORAGE_KEY = "ANDY_PRO_V2_PDF";

const $ = (id) => document.getElementById(id);

function hojeISO() {
  const d = new Date();
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d - tz).toISOString().slice(0, 10);
}
function uid(){ return Math.random().toString(16).slice(2) + Date.now().toString(16); }

function esc(s) {
  return (s ?? "").toString().replace(/[&<>"']/g, (m) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[m]));
}
function nl2br(s){ return esc(s || "—").replace(/\n/g,"<br>"); }

function cycle(v){
  if (v === null || v === undefined) return 0;
  if (v === 0) return 3;
  if (v === 3) return 5;
  return null;
}

function defaultNotas() {
  return Object.fromEntries(CRITS.map(c => [c.key, null]));
}
function defaultRegistroDia() {
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

function ensureDia() {
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
  const vals = Object.values(notas||{}).filter(v=>typeof v==="number");
  const max = CRITS.length*5;
  if(!vals.length) return {sum:null,max,nota10:null};
  const sum = vals.reduce((a,b)=>a+b,0);
  const nota10 = Math.round(((sum/max)*10)*10)/10;
  return {sum,max,nota10};
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
  fillPreceptor();
  ensureDia();

  if(!state.selecionado && state.alunos.length) state.selecionado = state.alunos[0].id;

  renderAll();
}

function fillPreceptor(){
  $("prof_nome").value = state.preceptor.nome || "";
  $("prof_tel").value = state.preceptor.tel || "";
  $("prof_disc").value = state.preceptor.disc || "Clínica Integrada";
  $("prof_local").value = state.preceptor.local || "";
  $("prof_grupo").value = state.preceptor.grupo || "";
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
    btn.innerHTML = `<b>${esc(a.nome)}</b><div class="sub">Mat: ${esc(a.mat||"—")} • ${esc(r.presenca)} • Nota: ${esc(notaTxt)}</div>`;
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
      ${CRITS.map(c=>`<th>${esc(c.label)}</th>`).join("")}
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
          <b style="cursor:pointer" onclick="selectAluno('${a.id}')">${esc(a.nome)}</b><br/>
          <span style="color:#607D8B;font-size:12px">Mat: ${esc(a.mat||"—")}</span>
        </td>
        <td>
          <select onchange="setPresenca('${a.id}', this.value)">
            ${["Presente","Atraso","Falta"].map(p=>`<option ${r.presenca===p?"selected":""}>${p}</option>`).join("")}
          </select>
        </td>
        ${cells}
        <td>
          <input value="${esc(r.obs||"")}" placeholder="ex.: revisar SOAP" oninput="setObs('${a.id}', this.value)" />
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
      <b>${esc(c.label)}</b>
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

  const fila = [];
  state.alunos.forEach(a=>{
    const r = getReg(a.id);
    const precisa = (r.presenca==="Falta") || (r.reposicao==="Sim");
    if(precisa){
      fila.push({ id:a.id, nome:a.nome, mat:a.mat||"", repData:r.repData||"", status:r.repStatus||"pendente" });
    }
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
        <b>${esc(item.nome)}</b>
        <div class="meta">Mat: ${esc(item.mat||"—")} • Prev: ${esc(item.repData||"—")}</div>
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
  const c = getCaso();
  $("caso_qp").value = c.qp || "";
  $("caso_hda").value = c.hda || "";
  $("caso_achados").value = c.achados || "";
  $("caso_hipoteses").value = c.hipoteses || "";
  $("caso_conduta").value = c.conduta || "";
}

/* ---------- ações expostas ---------- */
window.selectAluno = (id)=>{ state.selecionado=id; renderAll(); };
window.toggleNota = (alunoId, critKey)=>{ const r=getReg(alunoId); r.notas[critKey]=cycle(r.notas[critKey]); renderAll(); };
window.setPresenca = (alunoId, val)=>{ const r=getReg(alunoId); r.presenca=val; if(val==="Falta") r.reposicao="Sim"; renderAll(); };
window.setReposicao = (alunoId, val)=>{ const r=getReg(alunoId); r.reposicao=val; renderAll(); };
window.setObs = (alunoId, val)=>{ const r=getReg(alunoId); r.obs=val; save(); };
window.setNotaCard = (critKey, val)=>{ if(!state.selecionado) return; const r=getReg(state.selecionado); r.notas[critKey]=val; renderAll(); };
window.toggleRep = (alunoId)=>{ const r=getReg(alunoId); r.repStatus = (r.repStatus==="feita") ? "pendente" : "feita"; renderAll(); };

/* ---------- alunos ---------- */
function novoAluno(nomeDefault){
  if(state.alunos.length>=6) return alert("Máximo de 6 alunos.");
  const a = { id:uid(), nome:nomeDefault || `Aluno ${state.alunos.length+1}`, mat:"", tel:"" };
  state.alunos.push(a);
  ensureDia();
  state.selecionado = a.id;
  renderAll();
}
function preencher6(){
  while(state.alunos.length<6) novoAluno(`Aluno ${state.alunos.length+1}`);
}
function limparDia(){
  if(!confirm("Limpar notas/obs do DIA atual (não apaga outros dias)?")) return;
  ensureDia();
  const k = diaKey();
  state.alunos.forEach(a=> state.dias[k].registros[a.id] = defaultRegistroDia());
  renderAll();
}

/* ---------- salvar aluno e autosave ---------- */
function salvarAluno(){
  if(!state.selecionado) return alert("Selecione um aluno.");
  const a = state.alunos.find(x=>x.id===state.selecionado);
  const r = getReg(state.selecionado);

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

  renderAll();
  alert("Aluno salvo ✅");
}

function autosaveAlunoSilencioso(){
  if(!state.selecionado) return;
  const a = state.alunos.find(x=>x.id===state.selecionado);
  const r = getReg(state.selecionado);

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

/* ---------- caso ---------- */
function salvarCaso(){
  const c = getCaso();
  c.qp = $("caso_qp").value || "";
  c.hda = $("caso_hda").value || "";
  c.achados = $("caso_achados").value || "";
  c.hipoteses = $("caso_hipoteses").value || "";
  c.conduta = $("caso_conduta").value || "";
  save();
}
function limparCaso(){
  if(!confirm("Limpar o caso do dia (só essa data)?")) return;
  const c=getCaso();
  c.qp=c.hda=c.achados=c.hipoteses=c.conduta="";
  renderAll(); save();
}

/* ---------- feedback gerador ---------- */
function gerarFeedback(modo){
  if(!state.selecionado) return alert("Selecione um aluno.");
  const fortes  = ($("fb_fortes").value || "—").trim();
  const melhorar= ($("fb_melhorar").value || "—").trim();
  const estudar = ($("fb_estudar").value || "—").trim();

  let intro="", fim="";
  if(modo==="encorajador"){
    intro="Você está evoluindo. O objetivo aqui é acelerar tua curva de aprendizado com segurança.";
    fim="Segue firme — com constância, tua performance sobe rápido.";
  } else if(modo==="direto"){
    intro="Feedback objetivo da prática (pra te deixar mais forte):";
    fim="Próxima prática: execute isso com consistência e eu reviso contigo.";
  } else {
    intro="Feedback do dia (orientador):";
    fim="A ideia é te guiar no próximo passo, sem pressão desnecessária.";
  }

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

  autosaveAlunoSilencioso();
  alert("Feedback gerado ✅");
}

/* ---------- histórico modal ---------- */
function abrirHistorico(){
  if(!state.selecionado) return alert("Selecione um aluno.");
  const a = state.alunos.find(x=>x.id===state.selecionado);

  const regs = [];
  Object.keys(state.dias).sort().forEach(d=>{
    const reg = state.dias[d]?.registros?.[a.id];
    if(!reg) return;
    const sc=score(reg.notas);
    const precisa = (reg.presenca==="Falta") || (reg.reposicao==="Sim");
    regs.push({
      data:d,
      presenca:reg.presenca,
      nota:sc.nota10,
      obs:reg.obs||"",
      rep:precisa ? `${reg.repStatus||"pendente"} / ${reg.repData||"—"}` : "—"
    });
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
            <td style="border:1px solid #cfd8dc;padding:8px;">${esc(r.data)}</td>
            <td style="border:1px solid #cfd8dc;padding:8px;">${esc(r.presenca)}</td>
            <td style="border:1px solid #cfd8dc;padding:8px;">${r.nota==null?"—":esc(String(r.nota))}</td>
            <td style="border:1px solid #cfd8dc;padding:8px;">${esc(r.obs)}</td>
            <td style="border:1px solid #cfd8dc;padding:8px;">${esc(r.rep)}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  ` : `<div style="color:#607D8B;">Sem histórico ainda.</div>`;

  $("modal").classList.add("show");
}
function fecharModal(){ $("modal").classList.remove("show"); }

/* =========================
   PDF PREMIUM (AQUI É O UPGRADE)
   - fonte 12
   - borda completa, cantos arredondados
   - header com logo + dados
   - texto centralizado e organizado
========================= */

function logoHTML(){
  return `
  <div style="display:flex;align-items:center;justify-content:center;gap:12px;margin-bottom:10px;">
    <div style="display:flex;align-items:center;gap:8px;border:1px solid rgba(30,136,229,.35);border-radius:16px;padding:10px 14px;background:#f4f9ff;">
      <div style="width:54px;height:54px;border-radius:18px;display:flex;align-items:center;justify-content:center;background:#E3F2FD;border:1px solid rgba(30,136,229,.35);color:#1E88E5;font-weight:900;font-size:28px;">A</div>
      <div style="color:#1E88E5;font-weight:900;font-size:18px;letter-spacing:1px;">NDY</div>
    </div>
    <div style="text-align:center;">
      <div style="font-size:18px;font-weight:900;color:#1E88E5;line-height:1;">ANDY</div>
      <div style="font-size:12px;color:#607D8B;">Assistente de Prática Clínica Integrada</div>
    </div>
  </div>`;
}

function boxHTML(title, body){
  return `
  <div style="border:1px solid #cfd8dc;border-radius:18px;padding:12px 14px;margin-top:10px;">
    <div style="text-align:center;font-weight:900;color:#1E88E5;margin-bottom:8px;">${esc(title)}</div>
    <div style="font-size:12px;line-height:1.35;">${body}</div>
  </div>`;
}

function headerPDF(){
  const p = state.preceptor;
  return `
    ${logoHTML()}
    <div style="border:1px solid #cfd8dc;border-radius:18px;padding:12px 14px;">
      <div style="text-align:center;font-size:12px;">
        <b>Preceptor:</b> ${esc(p.nome||"—")} &nbsp; | &nbsp;
        <b>Tel:</b> ${esc(p.tel||"—")} &nbsp; | &nbsp;
        <b>Data:</b> ${esc(diaKey())}
      </div>
      <div style="text-align:center;font-size:12px;margin-top:6px;">
        <b>Disciplina:</b> ${esc(p.disc||"—")} &nbsp; | &nbsp;
        <b>Local:</b> ${esc(p.local||"—")} &nbsp; | &nbsp;
        <b>Grupo:</b> ${esc(p.grupo||"—")}
      </div>
    </div>
  `;
}

function casoPDFHTML(){
  const c = getCaso();
  if(!c.qp && !c.hda && !c.achados && !c.hipoteses && !c.conduta) return "";
  return boxHTML("Caso clínico do dia (anonimizado)", `
    <div><b>Queixa principal:</b><br>${nl2br(c.qp)}</div>
    <div style="margin-top:8px;"><b>História / contexto:</b><br>${nl2br(c.hda)}</div>
    <div style="margin-top:8px;"><b>Achados relevantes:</b><br>${nl2br(c.achados)}</div>
    <div style="margin-top:8px;"><b>Hipóteses e diferenciais:</b><br>${nl2br(c.hipoteses)}</div>
    <div style="margin-top:8px;"><b>Conduta + pontos para estudo:</b><br>${nl2br(c.conduta)}</div>
  `);
}

function printHTML(inner){
  const area = $("printArea");

  // força salvar tudo antes do PDF
  autosaveAlunoSilencioso();
  salvarCaso();
  save();

  // CSS do PDF (fonte 12, borda completa, cantos arredondados, centralizações)
  const css = `
    <style>
      @page { size: A4; margin: 12mm; }
      body{ font-family: Arial,Helvetica,sans-serif; font-size: 12pt; }
      .page{
        border: 2px solid #1E88E5;
        border-radius: 18px;
        padding: 12px 14px;
      }
      .center{ text-align:center; }
      table{ width:100%; border-collapse:collapse; font-size:12pt; }
      th, td{ border:1px solid #cfd8dc; padding:8px; vertical-align:top; }
      th{ background:#E3F2FD; color:#1E88E5; font-weight:900; }
      .sign{ display:flex; gap:12px; margin-top:16px; }
      .sign > div{ flex:1; border-top:1px solid #b0bec5; padding-top:8px; text-align:center; }
    </style>
  `;

  area.innerHTML = `${css}<div class="page">${inner}</div>`;
  void area.offsetHeight;
  window.print();
  setTimeout(()=>{ area.innerHTML=""; }, 1600);
}

function pdfDia(){
  ensureDia();

  const linhas = state.alunos.map(a=>{
    const r=getReg(a.id);
    const sc=score(r.notas);
    const precisa = (r.presenca==="Falta") || (r.reposicao==="Sim");
    return `
      <tr>
        <td><b>${esc(a.nome)}</b><br>Mat: ${esc(a.mat||"—")}<br>Tel: ${esc(a.tel||"—")}</td>
        <td class="center">${esc(r.presenca)}</td>
        ${CRITS.map(c=>{
          const v=r.notas[c.key];
          return `<td class="center">${(v==null)?"—":v}</td>`;
        }).join("")}
        <td class="center"><b>${sc.nota10==null?"—":esc(String(sc.nota10))}</b></td>
        <td>${esc(r.obs||"")}</td>
        <td class="center">${precisa ? esc(r.repStatus||"pendente") : "—"}</td>
        <td class="center">${precisa ? esc(r.repData||"—") : "—"}</td>
      </tr>
    `;
  }).join("");

  const tabela = `
    <div style="margin-top:10px;text-align:center;font-weight:900;color:#1E88E5;">Relatório do Dia</div>
    <table>
      <thead>
        <tr>
          <th>Aluno</th>
          <th>Presença</th>
          ${CRITS.map(c=>`<th>${esc(c.label)}</th>`).join("")}
          <th>Nota</th>
          <th>Observações</th>
          <th>Reposição</th>
          <th>Prevista</th>
        </tr>
      </thead>
      <tbody>${linhas}</tbody>
    </table>
  `;

  const html = `
    ${headerPDF()}
    ${boxHTML("Resumo do dia", `
      <div class="center">Total de alunos: <b>${state.alunos.length}</b></div>
      <div class="center">Gerado pelo ANDY • ${esc(new Date().toLocaleString())}</div>
    `)}
    ${boxHTML("Tabela de avaliação", tabela)}
    ${casoPDFHTML()}
    <div class="sign">
      <div>Assinatura do Preceptor</div>
      <div>Ciência (Turma)</div>
    </div>
  `;

  printHTML(html);
}

function pdfAluno(){
  if(!state.selecionado) return alert("Selecione um aluno.");
  ensureDia();

  const a = state.alunos.find(x=>x.id===state.selecionado);
  const r = getReg(state.selecionado);
  const sc = score(r.notas);
  const precisa = (r.presenca==="Falta") || (r.reposicao==="Sim");

  const notasTabela = `
    <table>
      <thead><tr><th>Critério</th><th>Nota</th></tr></thead>
      <tbody>
        ${CRITS.map(c=>`<tr><td>${esc(c.label)}</td><td class="center">${(r.notas[c.key]==null)?"—":r.notas[c.key]}</td></tr>`).join("")}
        <tr><td><b>Nota sugerida (0–10)</b></td><td class="center"><b>${sc.nota10==null?"—":esc(String(sc.nota10))}</b></td></tr>
      </tbody>
    </table>
  `;

  const html = `
    ${headerPDF()}
    ${boxHTML("Identificação do aluno", `
      <div class="center"><b>${esc(a?.nome||"—")}</b></div>
      <div class="center">Matrícula: ${esc(a?.mat||"—")} • Telefone: ${esc(a?.tel||"—")}</div>
      <div class="center" style="margin-top:6px;">
        Presença: <b>${esc(r.presenca)}</b> • Reposição: <b>${precisa ? esc(r.repStatus||"pendente") : "—"}</b> • Prevista: <b>${precisa ? esc(r.repData||"—") : "—"}</b>
      </div>
      <div style="margin-top:8px;"><b>Observação curta:</b><br>${nl2br(r.obs)}</div>
    `)}
    ${boxHTML("Notas", notasTabela)}
    ${boxHTML("Feedback", `
      <div><b>Pontos fortes:</b><br>${nl2br(r.feedback?.fortes)}</div>
      <div style="margin-top:8px;"><b>Pontos a melhorar:</b><br>${nl2br(r.feedback?.melhorar)}</div>
      <div style="margin-top:8px;"><b>O que estudar / ação prática:</b><br>${nl2br(r.feedback?.estudar)}</div>
      <div style="margin-top:8px;"><b>Mensagem encorajadora:</b><br>${nl2br(r.feedback?.msg)}</div>
    `)}
    ${casoPDFHTML()}
    <div class="sign">
      <div>Assinatura do Preceptor</div>
      <div>Ciência do Aluno</div>
    </div>
  `;
  printHTML(html);
}

/* ---------- modal + botões ---------- */
function wire(){
  $("dia").value = $("dia").value || hojeISO();

  $("btnHoje").onclick = ()=>{ $("dia").value=hojeISO(); renderAll(); };
  $("btnPDFDia").onclick = ()=>pdfDia();
  $("btnPDFDia2").onclick = ()=>pdfDia();
  $("btnPDFAluno").onclick = ()=>pdfAluno();
  $("btnPDFAluno2").onclick = ()=>pdfAluno();

  $("btnSalvarTudo").onclick = ()=>{ autosaveAlunoSilencioso(); salvarCaso(); save(); alert("Salvo ✅"); };
  $("btnSalvarTudo2").onclick = ()=>{ autosaveAlunoSilencioso(); salvarCaso(); save(); alert("Salvo ✅"); };

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
      $(id).addEventListener("input", ()=>autosaveAlunoSilencioso());
      $(id).addEventListener("change", ()=>autosaveAlunoSilencioso());
    });

  ["caso_qp","caso_hda","caso_achados","caso_hipoteses","caso_conduta"]
    .forEach(id=>$(id).addEventListener("input", ()=>salvarCaso()));

  if("serviceWorker" in navigator){
    navigator.serviceWorker.register("./service-worker.js").catch(()=>{});
  }
}

(function init(){
  wire();
  load();
})();
