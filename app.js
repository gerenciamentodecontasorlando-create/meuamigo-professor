/* ANDY PRO — app.js
   ✔ Offline (localStorage)
   ✔ Até 6 alunos por preceptor
   ✔ Modo rápido (— → 0 → 3 → 5)
   ✔ Cartão do aluno (notas + feedback + presença + reposição)
   ✔ Histórico por DATA (não mistura dias)
   ✔ Caso clínico do dia (anonimizado) por data
   ✔ PDF do dia / PDF do aluno com identificação do aluno
*/

const CRITS = [
  { key: "aciduidade", label: "Aciduidade" },
  { key: "conhecimento_previo", label: "Conhecimento prévio" },
  { key: "postura", label: "Postura" },
  { key: "proatividade", label: "Proatividade" },
  { key: "socializacao", label: "Socialização" },
  { key: "expressividade", label: "Expressividade" },
];

const STORAGE_KEY = "ANDY_PRO_V1";

const $ = (id) => document.getElementById(id);

function hojeISO() {
  const d = new Date();
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d - tz).toISOString().slice(0, 10);
}

function uid() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

function esc(s) {
  return (s ?? "").toString().replace(/[&<>"']/g, (m) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[m]));
}

function cycle(v) {
  if (v === null || v === undefined) return 0;
  if (v === 0) return 3;
  if (v === 3) return 5;
  return null; // volta para —
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
    repStatus: "pendente" // pendente|feita
  };
}

function defaultCaso() {
  return { qp: "", hda: "", achados: "", hipoteses: "", conduta: "" };
}

// Estado principal (tudo offline)
let state = {
  preceptor: { nome: "", tel: "", disc: "Clínica Integrada", local: "", grupo: "" },
  alunos: [], // [{id,nome,mat,tel}]
  // dias: { "2026-01-14": { registros: { alunoId: registroDia }, caso: casoDia } }
  dias: {},
  selecionado: null
};

function diaKey() {
  return $("dia").value || hojeISO();
}

function ensureDia() {
  const k = diaKey();
  if (!state.dias[k]) state.dias[k] = { registros: {}, caso: defaultCaso() };

  // garantir registro do dia para cada aluno existente
  state.alunos.forEach(a => {
    if (!state.dias[k].registros[a.id]) state.dias[k].registros[a.id] = defaultRegistroDia();
  });
}

function getReg(alunoId) {
  ensureDia();
  const k = diaKey();
  if (!state.dias[k].registros[alunoId]) state.dias[k].registros[alunoId] = defaultRegistroDia();
  return state.dias[k].registros[alunoId];
}

function getCaso() {
  ensureDia();
  return state.dias[diaKey()].caso;
}

function score(notas) {
  const vals = Object.values(notas || {}).filter(v => typeof v === "number");
  const max = CRITS.length * 5;
  if (!vals.length) return { sum: null, max, nota10: null };
  const sum = vals.reduce((a, b) => a + b, 0);
  const nota10 = Math.round(((sum / max) * 10) * 10) / 10;
  return { sum, max, nota10 };
}

function save() {
  // capturar preceptor
  state.preceptor = {
    nome: $("prof_nome").value || "",
    tel: $("prof_tel").value || "",
    disc: $("prof_disc").value || "",
    local: $("prof_local").value || "",
    grupo: $("prof_grupo").value || "",
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function load() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try { state = JSON.parse(raw); } catch (e) {}
  }
  // saneamento
  state.preceptor ||= { nome: "", tel: "", disc: "Clínica Integrada", local: "", grupo: "" };
  state.alunos ||= [];
  state.dias ||= {};
  state.selecionado ||= null;

  $("dia").value = $("dia").value || hojeISO();
  fillPreceptor();
  ensureDia();

  if (!state.selecionado && state.alunos.length) state.selecionado = state.alunos[0].id;

  renderAll();
}

function fillPreceptor() {
  $("prof_nome").value = state.preceptor.nome || "";
  $("prof_tel").value = state.preceptor.tel || "";
  $("prof_disc").value = state.preceptor.disc || "Clínica Integrada";
  $("prof_local").value = state.preceptor.local || "";
  $("prof_grupo").value = state.preceptor.grupo || "";
}

// ---------- UI RENDER ----------
function renderAll() {
  ensureDia();
  renderListaAlunos();
  renderTabelaRapida();
  renderCriteriosCard();
  renderCartaoAluno();
  renderFilaReposicoes();
  renderCaso();
  save();
}

function renderListaAlunos() {
  const wrap = $("listaAlunos");
  wrap.innerHTML = "";

  if (!state.alunos.length) {
    wrap.innerHTML = `<div class="hint">Sem alunos cadastrados. Clique em “+ Novo aluno”.</div>`;
    return;
  }

  state.alunos.forEach(a => {
    const r = getReg(a.id);
    const btn = document.createElement("button");
    btn.className = (state.selecionado === a.id) ? "active" : "";

    const sc = score(r.notas);
    const notaTxt = sc.nota10 === null ? "—" : sc.nota10;

    btn.innerHTML = `
      <b>${esc(a.nome)}</b>
      <div class="sub">Mat: ${esc(a.mat || "—")} • ${esc(r.presenca)} • Nota: ${esc(notaTxt)}</div>
    `;
    btn.onclick = () => { state.selecionado = a.id; renderAll(); };
    wrap.appendChild(btn);
  });
}

function renderTabelaRapida() {
  const tb = $("tabelaRapida");

  if (!state.alunos.length) {
    tb.innerHTML = `<tr><td style="padding:14px;color:#607D8B">Cadastre alunos para usar o modo rápido.</td></tr>`;
    return;
  }

  const head = `
    <tr>
      <th>Aluno</th>
      <th>Presença</th>
      ${CRITS.map(c => `<th>${esc(c.label)}</th>`).join("")}
      <th>Obs curta</th>
      <th>Reposição</th>
    </tr>`;

  const rows = state.alunos.map(a => {
    const r = getReg(a.id);

    const cells = CRITS.map(c => {
      const v = r.notas[c.key];
      const cls = (v === null || v === undefined) ? "v" : (v === 0 ? "n0" : (v === 3 ? "n3" : "n5"));
      const txt = (v === null || v === undefined) ? "—" : v;
      return `<td class="cellTap ${cls}" onclick="toggleNota('${a.id}','${c.key}')">${txt}</td>`;
    }).join("");

    return `
      <tr>
        <td>
          <b style="cursor:pointer" onclick="selectAluno('${a.id}')">${esc(a.nome)}</b><br/>
          <span style="color:#607D8B;font-size:12px">Mat: ${esc(a.mat || "—")}</span>
        </td>
        <td>
          <select onchange="setPresenca('${a.id}', this.value)">
            ${["Presente", "Atraso", "Falta"].map(p => `<option ${r.presenca === p ? "selected" : ""}>${p}</option>`).join("")}
          </select>
        </td>
        ${cells}
        <td>
          <input value="${esc(r.obs || "")}" placeholder="ex.: revisar SOAP"
            oninput="setObs('${a.id}', this.value)" />
        </td>
        <td>
          <select onchange="setReposicao('${a.id}', this.value)">
            <option ${r.reposicao === "Não" ? "selected" : ""}>Não</option>
            <option ${r.reposicao === "Sim" ? "selected" : ""}>Sim</option>
          </select>
        </td>
      </tr>
    `;
  }).join("");

  tb.innerHTML = head + rows;
}

function renderCriteriosCard() {
  const wrap = $("criterios");
  wrap.innerHTML = "";

  if (!state.selecionado) return;
  const r = getReg(state.selecionado);

  CRITS.forEach(c => {
    const v = r.notas[c.key];
    const row = document.createElement("div");
    row.className = "crit";
    row.innerHTML = `
      <b>${esc(c.label)}</b>
      <div class="critBtns">
        <button class="pbtn ${v === 0 ? "active" : ""}" onclick="setNotaCard('${c.key}',0)">0</button>
        <button class="pbtn ${v === 3 ? "active" : ""}" onclick="setNotaCard('${c.key}',3)">3</button>
        <button class="pbtn ${v === 5 ? "active" : ""}" onclick="setNotaCard('${c.key}',5)">5</button>
      </div>
    `;
    wrap.appendChild(row);
  });
}

function renderCartaoAluno() {
  const tag = $("alunoTag");

  if (!state.selecionado) {
    tag.textContent = "Selecione um aluno";
    $("al_nome").value = "";
    $("al_mat").value = "";
    $("al_tel").value = "";
    return;
  }

  const a = state.alunos.find(x => x.id === state.selecionado);
  const r = getReg(state.selecionado);

  tag.textContent = a?.nome ? `Selecionado: ${a.nome}` : "Aluno";

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
  $("scoreBox").textContent = (sc.sum === null) ? "—" : `${sc.sum}/${sc.max}`;
  $("notaBox").textContent = (sc.nota10 === null) ? "—" : `${sc.nota10}`;
}

function renderFilaReposicoes() {
  const wrap = $("filaReposicoes");
  wrap.innerHTML = "";

  if (!state.alunos.length) {
    wrap.innerHTML = `<div class="hint">Cadastre alunos para aparecer reposições.</div>`;
    return;
  }

  const fila = [];
  state.alunos.forEach(a => {
    const r = getReg(a.id);
    const precisa = (r.presenca === "Falta") || (r.reposicao === "Sim");
    if (precisa) {
      fila.push({
        id: a.id,
        nome: a.nome,
        mat: a.mat || "",
        repData: r.repData || "",
        status: r.repStatus || "pendente"
      });
    }
  });

  if (!fila.length) {
    wrap.innerHTML = `<div class="hint">Sem reposições pendentes no dia selecionado ✅</div>`;
    return;
  }

  fila.forEach(item => {
    const div = document.createElement("div");
    div.className = "repItem";
    div.innerHTML = `
      <div>
        <b>${esc(item.nome)}</b>
        <div class="meta">Mat: ${esc(item.mat || "—")} • Prev: ${esc(item.repData || "—")}</div>
      </div>
      <div style="display:flex;gap:8px;align-items:center;">
        <span class="tag ${item.status === "feita" ? "feita" : "pendente"}">
          ${item.status === "feita" ? "Feita" : "Pendente"}
        </span>
        <button class="btn ghost" onclick="toggleRep('${item.id}')">Alternar</button>
      </div>
    `;
    wrap.appendChild(div);
  });
}

function renderCaso() {
  const c = getCaso();
  $("caso_qp").value = c.qp || "";
  $("caso_hda").value = c.hda || "";
  $("caso_achados").value = c.achados || "";
  $("caso_hipoteses").value = c.hipoteses || "";
  $("caso_conduta").value = c.conduta || "";
}

// ---------- AÇÕES (expostas para HTML inline) ----------
window.selectAluno = function(id){
  state.selecionado = id;
  renderAll();
}

window.toggleNota = function(alunoId, critKey){
  const r = getReg(alunoId);
  r.notas[critKey] = cycle(r.notas[critKey]);
  renderAll();
}

window.setPresenca = function(alunoId, val){
  const r = getReg(alunoId);
  r.presenca = val;
  if (val === "Falta") r.reposicao = "Sim";
  renderAll();
}

window.setReposicao = function(alunoId, val){
  const r = getReg(alunoId);
  r.reposicao = val;
  renderAll();
}

window.setObs = function(alunoId, val){
  const r = getReg(alunoId);
  r.obs = val;
  save();
}

window.setNotaCard = function(critKey, val){
  if(!state.selecionado) return;
  const r = getReg(state.selecionado);
  r.notas[critKey] = val;
  renderAll();
}

window.toggleRep = function(alunoId){
  const r = getReg(alunoId);
  r.repStatus = (r.repStatus === "feita") ? "pendente" : "feita";
  renderAll();
}

// ---------- CRUD ALUNOS ----------
function novoAluno(nomeDefault){
  if (state.alunos.length >= 6) return alert("Máximo de 6 alunos por grupo.");
  const a = { id: uid(), nome: nomeDefault || `Aluno ${state.alunos.length + 1}`, mat: "", tel: "" };
  state.alunos.push(a);
  ensureDia();
  state.selecionado = a.id;
  renderAll();
}

function preencher6(){
  while(state.alunos.length < 6){
    novoAluno(`Aluno ${state.alunos.length + 1}`);
  }
}

function limparDia(){
  if (!confirm("Limpar as notas/observações do DIA atual (não apaga outros dias)?")) return;
  ensureDia();
  const k = diaKey();
  state.alunos.forEach(a=>{
    state.dias[k].registros[a.id] = defaultRegistroDia();
  });
  renderAll();
}

// ---------- SALVAR ALUNO (CARTÃO) ----------
function salvarAluno(){
  if (!state.selecionado) return alert("Selecione um aluno.");

  const a = state.alunos.find(x => x.id === state.selecionado);
  const r = getReg(state.selecionado);

  a.nome = $("al_nome").value || a.nome;
  a.mat = $("al_mat").value || "";
  a.tel = $("al_tel").value || "";

  r.presenca = $("al_presenca").value;
  r.reposicao = $("al_reposicao").value;
  r.repData = $("al_repdata").value || "";
  r.obs = $("al_obs").value || "";

  r.feedback = {
    fortes: $("fb_fortes").value || "",
    melhorar: $("fb_melhorar").value || "",
    estudar: $("fb_estudar").value || "",
    msg: $("fb_msg").value || ""
  };

  if (r.presenca === "Falta") r.reposicao = "Sim";

  renderAll();
  alert("Aluno salvo ✅");
}

function autosaveAlunoSilencioso(){
  if (!state.selecionado) return;
  const a = state.alunos.find(x => x.id === state.selecionado);
  const r = getReg(state.selecionado);

  a.nome = $("al_nome").value || a.nome;
  a.mat = $("al_mat").value || "";
  a.tel = $("al_tel").value || "";

  r.presenca = $("al_presenca").value;
  r.reposicao = $("al_reposicao").value;
  r.repData = $("al_repdata").value || "";
  r.obs = $("al_obs").value || "";

  r.feedback = {
    fortes: $("fb_fortes").value || "",
    melhorar: $("fb_melhorar").value || "",
    estudar: $("fb_estudar").value || "",
    msg: $("fb_msg").value || ""
  };

  if (r.presenca === "Falta") r.reposicao = "Sim";
  save();
}

// ---------- CASO DO DIA ----------
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
  if (!confirm("Limpar o caso do dia (somente a data selecionada)?")) return;
  const c = getCaso();
  c.qp = c.hda = c.achados = c.hipoteses = c.conduta = "";
  renderAll();
  save();
}

// ---------- FEEDBACK GERADOR (sem humilhar) ----------
function gerarFeedback(modo){
  if (!state.selecionado) return alert("Selecione um aluno.");
  const fortes = ($("fb_fortes").value || "—").trim();
  const melhorar = ($("fb_melhorar").value || "—").trim();
  const estudar = ($("fb_estudar").value || "—").trim();

  let intro="", fim="";
  if (modo === "encorajador"){
    intro = "Você está evoluindo. O objetivo aqui é acelerar tua curva de aprendizado com segurança.";
    fim = "Segue firme — com constância, tua performance sobe rápido.";
  } else if (modo === "direto"){
    intro = "Feedback objetivo da prática (pra te deixar mais forte):";
    fim = "Próxima prática: execute isso com consistência e eu reviso contigo.";
  } else {
    intro = "Feedback do dia (orientador):";
    fim = "A ideia é te guiar no próximo passo, sem pressão desnecessária.";
  }

  const msg =
`${intro}

✅ Pontos fortes:
- ${fortes}

🔧 Pontos a melhorar:
- ${melhorar}

📚 O que estudar / ação prática:
- ${estudar}

🤝 Mensagem:
${fim}`;

  $("fb_msg").value = msg;
  autosaveAlunoSilencioso();
  alert("Feedback gerado ✅");
}

// ---------- HISTÓRICO (por data) ----------
function abrirHistorico(){
  if (!state.selecionado) return alert("Selecione um aluno.");

  const a = state.alunos.find(x => x.id === state.selecionado);
  const registros = [];

  Object.keys(state.dias).sort().forEach(d=>{
    const reg = state.dias[d]?.registros?.[a.id];
    if (!reg) return;
    const sc = score(reg.notas);
    const precisaRep = (reg.presenca === "Falta") || (reg.reposicao === "Sim");
    registros.push({
      data: d,
      presenca: reg.presenca,
      nota: sc.nota10,
      score: sc.sum,
      obs: reg.obs || "",
      rep: precisaRep ? `${reg.repStatus || "pendente"} / ${reg.repData || "—"}` : "—"
    });
  });

  const body = $("modalBody");
  body.innerHTML = `
    <div style="margin-bottom:10px;"><b>Aluno:</b> ${esc(a.nome)} • <b>Mat:</b> ${esc(a.mat||"—")}</div>
    ${registros.length ? `
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
          ${registros.map(r=>`
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
    ` : `<div class="hint">Sem histórico ainda. Preencha pelo menos um dia.</div>`}
  `;

  $("modalTitle").textContent = `Histórico — ${a.nome}`;
  $("modal").classList.add("show");
}

function fecharModal(){
  $("modal").classList.remove("show");
}

// ---------- PDF (via impressão) ----------
function preceptorHeaderHTML(){
  const p = state.preceptor;
  return `
  <div style="border-bottom:4px solid #1E88E5;padding-bottom:10px;margin-bottom:14px;">
    <div style="font-size:18px;font-weight:950;color:#1E88E5;">ANDY PRO</div>
    <div style="color:#607D8B;font-size:12px;">Relatório institucional — Clínica Integrada</div>
  </div>

  <div style="border:1px solid #cfd8dc;border-left:6px solid #1E88E5;border-radius:14px;padding:12px;margin-bottom:12px;">
    <div><b>Preceptor:</b> ${esc(p.nome || "—")} &nbsp; | &nbsp; <b>Tel:</b> ${esc(p.tel || "—")}</div>
    <div><b>Disciplina:</b> ${esc(p.disc || "—")} &nbsp; | &nbsp; <b>Local:</b> ${esc(p.local || "—")}</div>
    <div><b>Data:</b> ${esc(diaKey())} &nbsp; | &nbsp; <b>Grupo:</b> ${esc(p.grupo || "—")}</div>
  </div>`;
}

function casoHTML(){
  const c = getCaso();
  if
