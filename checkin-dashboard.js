const SUPABASE_URL = "https://klpxoffkajijjktxztmc.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_O_MlVkyfreG125LVia6nag_1GL5bUli";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
const params=new URLSearchParams(location.search);
const corridaId=params.get('corrida');
const diaId=params.get('dia');
const tolerancia=30;
async function carregar(){
 const {data:inscricoes}=await supabaseClient.from('inscricoes').select('id,staff_id,staffs(nome)').eq('corrida_id',corridaId);
 const {data:checkins}=await supabaseClient.from('checkins').select('*').eq('corrida_dia_id',diaId);
 const lista=document.getElementById('dashboardLista');
 const confirmados=(inscricoes||[]).length;
 let presentes=0, atrasados=0;
 const rows=(inscricoes||[]).map(i=>{
  const c=(checkins||[]).find(x=>x.staff_id===i.staff_id);
  let status='Pendente'; let cls='pending'; let hora='-';
  if(c){ presentes++; hora=new Date(c.checkin_at).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
   status='Presente'; cls='ok';
   atrasados+=0;
  }
  return `<div class="dashboard-item ${cls}"><div><strong>${i.staffs?.nome||'Staff'}</strong><small>${status}</small></div><div>${hora}</div></div>`;
 }).join('');
 document.getElementById('statConfirmados').textContent=confirmados;
 document.getElementById('statPresentes').textContent=presentes;
 document.getElementById('statPendentes').textContent=Math.max(confirmados-presentes,0);
 document.getElementById('statAtrasados').textContent=atrasados;
 document.getElementById('dashboardProgressBar').style.width=`${confirmados?((presentes/confirmados)*100):0}%`;
 lista.innerHTML=rows||'<p>Nenhum registro.</p>';
}
setInterval(carregar,15000);
document.getElementById('btnAtualizar').onclick=carregar;
document.getElementById('btnPdf').onclick=()=>window.print();
document.getElementById('buscaCheckin').addEventListener('input',e=>{const t=e.target.value.toLowerCase();document.querySelectorAll('.dashboard-item').forEach(i=>i.style.display=i.innerText.toLowerCase().includes(t)?'flex':'none')});
carregar();
