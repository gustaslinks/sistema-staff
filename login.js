const SUPABASE_URL = "https://klpxoffkajijjktxztmc.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_O_MlVkyfreG125LVia6nag_1GL5bUli";

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

function onlyNumbers(value) {
  return value.replace(/\D/g, '');
}

function maskCPF(value) {
  value = onlyNumbers(value).slice(0, 11);

  value = value.replace(/(\d{3})(\d)/, '$1.$2');
  value = value.replace(/(\d{3})(\d)/, '$1.$2');
  value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');

  return value;
}

function maskDate(value) {
  value = onlyNumbers(value).slice(0, 8);

  value = value.replace(/(\d{2})(\d)/, '$1/$2');
  value = value.replace(/(\d{2})(\d)/, '$1/$2');

  return value;
}

function dateToSupabase(value) {
  const numbers = onlyNumbers(value);

  if (numbers.length !== 8) return '';

  const dia = numbers.slice(0, 2);
  const mes = numbers.slice(2, 4);
  const ano = numbers.slice(4, 8);

  return `${ano}-${mes}-${dia}`;
}

cpf.addEventListener('input', () => {
  cpf.value = maskCPF(cpf.value);
});

nascimento.addEventListener('input', () => {
  nascimento.value = maskDate(nascimento.value);
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  loginBtn.disabled = true;
  loginBtn.textContent = 'Entrando...';

  try {
    const dataConvertida = dateToSupabase(nascimento.value);

    if (!dataConvertida) {
      throw new Error('Digite a data de nascimento no formato dd/mm/aaaa.');
    }

    const { data, error } = await supabaseClient
      .from('staffs')
      .select('*')
      .eq('cpf', cpf.value)
      .eq('data_nascimento', dataConvertida)
      .single();

    if (error || !data) {
      throw new Error('Cadastro não encontrado.');
    }

    resultadoLogin.classList.remove('hidden');

    staffFoto.src = data.foto_url || '';
    staffNome.textContent = data.nome_completo || '';
    staffCidade.textContent = 'Cidade: ' + (data.cidade || '');
    staffTelefone.textContent = 'Telefone: ' + (data.telefone || '');
    staffEmail.textContent = 'E-mail: ' + (data.email || '');

  } catch (error) {
    alert(error.message);

  } finally {
    loginBtn.disabled = false;
    loginBtn.textContent = 'Entrar';
  }
});
alert(error.message);

}finally{

loginBtn.disabled = false;
loginBtn.textContent = 'Entrar';

}

});
