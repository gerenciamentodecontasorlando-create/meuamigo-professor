const CRITS=[
 {k:"aciduidade",l:"Aciduidade"},
 {k:"conhecimento",l:"Conhecimento prévio"},
 {k:"postura",l:"Postura"},
 {k:"proatividade",l:"Proatividade"},
 {k:"socializacao",l:"Socialização"},
 {k:"expressividade",l:"Expressividade"},
];

let alunos=[];
let sel=null;
let dia={};
let caso={};

function novoAluno(){
 if(alunos.length>=6)return alert("Máx 6 alunos");
 alunos.push({id:Date.now(),nome:"Aluno "+(alunos.length+1),notas:{},feedback:{}});
 sel=alunos[alunos.length-1].id;
 render();
}

function render(){
 listaAlunos.innerHTML="";
 alunos.forEach(a=>{
  let b=document.createElement("button");
  b.textContent=a.nome;
  b.onclick=()=>{sel=a.id;render();};
  listaAlunos.appendChild(b);
 });
 renderTabela();
 renderAluno();
 salvar();
}

function renderTabela(){
 let h="<tr><th>Aluno</th>";
 CRITS.forEach(c=>h+="<th>"+c.l+"</th>");
 h+="</tr>";
 alunos.forEach(a=>{
  h+="<tr><td>"+a.nome+"</td>";
  CRITS.forEach(c=>{
   let v=a.notas[c.k]??"—";
   h+=`<td onclick="nota(${a.id},'${c.k}')">${v}</td>`;
  });
  h+="</tr>";
 });
 tabelaRapida.innerHTML=h;
}

function nota(id,k){
 let a=alunos.find(x=>x.id===id);
 let v=a.notas[k];
 a.notas[k]=v==null?0:v==0?3:v==3?5:null;
 render();
}

function renderAluno(){
 if(!sel)return;
 let a=alunos.find(x=>x.id===sel);
 alunoNome.value=a.nome;
}

function salvarAluno(){
 let a=alunos.find(x=>x.id===sel);
 a.nome=alunoNome.value;
 a.feedback={
  fortes:fortes.value,
  melhorar:melhorar.value,
  acao:acao.value,
  encorajar:encorajar.value
 };
 salvar();
 alert("Salvo");
}

function salvarDia(){
 salvar();
 alert("Dia salvo");
}

function salvar(){
 localStorage.setItem("ANDY_PRO",JSON.stringify({alunos,caso}));
}

function pdfDia(){window.print();}
function pdfAluno(){window.print();}

(function(){
 let d=localStorage.getItem("ANDY_PRO");
 if(d){
  let j=JSON.parse(d);
  alunos=j.alunos||[];
  caso=j.caso||{};
 }
 render();
})();
