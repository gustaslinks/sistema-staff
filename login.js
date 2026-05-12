const SUPABASE_URL = "https://klpxoffkajijjktxztmc.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_O_MlVkyfreG125LVia6nag_1GL5bUli";
// NÃO use service_role, direct connection string ou senha do banco.

const supabaseClient = supabase.createClient(
SUPABASE_URL,
SUPABASE_ANON_KEY
);

const form = document.getElementById('loginForm');
const cpf = document.getElementById('cpf');
const nascimento = document.getElementById('nascimento');
const loginBtn = document.getElementById('loginBtn');

const resultadoLogin = document.getElementById('resultadoLogin');
const staffFoto = document.getElementById('staffFoto');
const staffNome = document.getElementById('staffNome');
const staffCidade = document.getElementById('staffCidade');
const staffTelefone = document.getElementById('staffTelefone');
const staffEmail = document.getElementById('staffEmail');

function onlyNumbers(value){
return value.replace(/\D/g,'');
}

function maskCPF(value){

value = onlyNumbers(value).slice(0,11);

value = value.replace(/(\d{3})(\d)/,'$1.$2');
value = value.replace(/(\d{3})(\d)/,'$1.$2');
value = value.replace(/(\d{3})(\d{1,2})$/,'$1-$2');

return value;
}

cpf.addEventListener('input',()=>{
cpf.value = maskCPF(cpf.value);
});

form.addEventListener('submit', async (event)=>{

event.preventDefault();

loginBtn.disabled = true;
loginBtn.textContent = 'Entrando...';

try{

const { data, error } = await supabaseClient
.from('staffs')
.select('*')
.eq('cpf', cpf.value)
.eq('data_nascimento', dateToSupabase(nascimento.value))
.single();

if(error || !data){
throw new Error('Cadastro não encontrado.');
}

resultadoLogin.classList.remove('hidden');

staffFoto.src = data.foto_url || '';
staffNome.textContent = data.nome_completo || '';
staffCidade.textContent = 'Cidade: ' + (data.cidade || '');
staffTelefone.textContent = 'Telefone: ' + (data.telefone || '');
staffEmail.textContent = 'E-mail: ' + (data.email || '');

}catch(error){

alert(error.message);

}finally{

loginBtn.disabled = false;
loginBtn.textContent = 'Entrar';

}

});
