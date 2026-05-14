// =====================================================
// CONFIGURAÇÃO SUPABASE
// EDITE SOMENTE AS 2 LINHAS ABAIXO
// =====================================================
const SUPABASE_URL = "https://klpxoffkajijjktxztmc.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_O_MlVkyfreG125LVia6nag_1GL5bUli";
// NÃO use service_role, direct connection string ou senha do banco.

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const nome = document.getElementById('nome');
const cpf = document.getElementById('cpf');
const cpfError = document.getElementById('cpfError');
const btnIrLogin = document.getElementById('btnIrLogin');
const rg = document.getElementById('rg');
const nascimento = document.getElementById('nascimento');
const telefone = document.getElementById('telefone');
const email = document.getElementById('email');
const cidade = document.getElementById('cidade');
const indicado = document.getElementById('indicado');
const pixOutro = document.getElementById('pixOutro');
const foto = document.getElementById('foto');
const observacoes = document.getElementById('observacoes');
const termos = document.getElementById('termos');
const form = document.getElementById('staffForm');
const successMessage = document.getElementById('successMessage');
const submitBtn = document.getElementById('submitBtn');
const touchedFields = new Set();
const paramsCadastro = new URLSearchParams(window.location.search);
const modoEdicao = paramsCadastro.get('editar') === '1';
const staffLogadoEdicao = JSON.parse(localStorage.getItem('staffLogado') || 'null');
let fotoAtualUrl = '';


function onlyNumbers(value){return value.replace(/\D/g,'');}
function removeExtraSpaces(value){return value.replace(/\s+/g,' ').trim();}

function capitalizeName(value){
  const lowercaseWords=['de','da','do','das','dos','e'];
  return removeExtraSpaces(value).toLowerCase().split(' ').map((word,index)=>{
    if(index>0 && lowercaseWords.includes(word)) return word;
    return word.split('-').map(part=>part ? part.charAt(0).toUpperCase()+part.slice(1) : part).join('-');
  }).join(' ');
}

function maskCPF(value){
  value=onlyNumbers(value).slice(0,11);
  value=value.replace(/(\d{3})(\d)/,'$1.$2');
  value=value.replace(/(\d{3})(\d)/,'$1.$2');
  value=value.replace(/(\d{3})(\d{1,2})$/,'$1-$2');
  return value;
}

function maskRG(value){
  value=value.replace(/[^0-9xX]/g,'').slice(0,9);
  if(value.length<=2) return value.toUpperCase();
  if(value.length<=5) return value.replace(/(\d{2})([0-9xX]+)/,'$1.$2').toUpperCase();
  if(value.length<=8) return value.replace(/(\d{2})(\d{3})([0-9xX]+)/,'$1.$2.$3').toUpperCase();
  return value.replace(/(\d{2})(\d{3})(\d{3})([0-9xX])$/,'$1.$2.$3-$4').toUpperCase();
}

function maskPhone(value){
  value=onlyNumbers(value).slice(0,11);
  if(value.length<=10){
    value=value.replace(/(\d{2})(\d)/,'($1) $2');
    value=value.replace(/(\d{4})(\d)/,'$1-$2');
  }else{
    value=value.replace(/(\d{2})(\d)/,'($1) $2');
    value=value.replace(/(\d{5})(\d)/,'$1-$2');
  }
  return value;
}

function isValidCPF(cpfValue){
  const numbers=onlyNumbers(cpfValue);
  if(numbers.length!==11) return false;
  if(/^(\d)\1+$/.test(numbers)) return false;
  let sum=0;
  for(let i=0;i<9;i++) sum+=parseInt(numbers[i])*(10-i);
  let digit1=11-(sum%11);
  if(digit1>=10) digit1=0;
  if(digit1!==parseInt(numbers[9])) return false;
  sum=0;
  for(let i=0;i<10;i++) sum+=parseInt(numbers[i])*(11-i);
  let digit2=11-(sum%11);
  if(digit2>=10) digit2=0;
  return digit2===parseInt(numbers[10]);
}

function isValidEmail(value){return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(removeExtraSpaces(value));}
function isValidPhone(value){const numbers=onlyNumbers(value);return numbers.length===10 || numbers.length===11;}
function isValidRG(value){const cleaned=value.replace(/[^0-9xX]/g,'').toUpperCase();return /^[0-9]{7,8}[0-9X]$/.test(cleaned);}

function isAtLeast16(dateValue){
  if(!dateValue) return false;
  let birthDate;
  if(dateValue.includes('/')){
    const parts=dateValue.split('/');
    if(parts.length!==3) return false;
    birthDate=new Date(`${parts[2]}-${parts[1]}-${parts[0]}T00:00:00`);
  }else{
    birthDate=new Date(dateValue+'T00:00:00');
  }
  if(Number.isNaN(birthDate.getTime())) return false;
  const today=new Date();
  let age=today.getFullYear()-birthDate.getFullYear();
  const monthDiff=today.getMonth()-birthDate.getMonth();
  if(monthDiff<0 || (monthDiff===0 && today.getDate()<birthDate.getDate())) age--;
  return age>=16 && birthDate<today;
}

function isValidPixOutro(value){
  const trimmed=removeExtraSpaces(value);
  const numbers=onlyNumbers(trimmed);
  return isValidEmail(trimmed) || isValidCPF(trimmed) || numbers.length===10 || numbers.length===11 || /^[a-zA-Z0-9\-]{20,80}$/.test(trimmed);
}

function setFieldStatus(fieldId,valid,shouldShow){
  const field=document.getElementById(fieldId);
  if(!field) return;
  field.classList.remove('valid','invalid');
  if(!shouldShow) return;
  field.classList.add(valid ? 'valid' : 'invalid');
}

function markTouched(fieldId){touchedFields.add(fieldId);}

function updatePixPreviews(){
  document.getElementById('pixCpfPreview').textContent=cpf.value || 'Usar o CPF deste cadastro';
  document.getElementById('pixEmailPreview').textContent=email.value || 'Usar o e-mail deste cadastro';
  document.getElementById('pixTelefonePreview').textContent=telefone.value || 'Usar o telefone deste cadastro';
}

function getValidationState(showAll=false){
  const selectedPix=document.querySelector('input[name="pixTipo"]:checked').value;
  const state={
    fieldNome:nome.value.trim().split(' ').filter(Boolean).length>=2,
    fieldCpf:isValidCPF(cpf.value),
    fieldRg:isValidRG(rg.value),
    fieldNascimento:isAtLeast16(nascimento.value),
    fieldTelefone:isValidPhone(telefone.value),
    fieldEmail:isValidEmail(email.value),
    fieldCidade:cidade.value.trim().length>=2,
    fieldIndicado:indicado.value.trim().length>=2,
    fieldObservacoes:observacoes.value.trim().length>=2,
    fieldFoto: modoEdicao ? (foto.files.length===0 || ['image/jpeg','image/png'].includes(foto.files[0].type)) : (foto.files.length>0 && ['image/jpeg','image/png'].includes(foto.files[0].type)),
    fieldPixOutro:selectedPix!=='outro' || isValidPixOutro(pixOutro.value),
    fieldTermos:termos.checked
  };
  Object.entries(state).forEach(([fieldId,valid])=>{
    const shouldShow=showAll || touchedFields.has(fieldId);
    if(fieldId!=='fieldTermos') setFieldStatus(fieldId,valid,shouldShow);
  });
  return state;
}

function isFormValid(showAll=false){return Object.values(getValidationState(showAll)).every(Boolean);}
function refreshSubmitState(){submitBtn.disabled=!isFormValid(false);}
function cleanTextField(input,shouldCapitalize=true){input.value=shouldCapitalize ? capitalizeName(input.value) : removeExtraSpaces(input.value);}

nome.addEventListener('input',()=>{nome.value=nome.value.replace(/^\s+/,'').replace(/\s{2,}/g,' ');markTouched('fieldNome');refreshSubmitState();});
nome.addEventListener('blur',()=>{cleanTextField(nome,true);markTouched('fieldNome');refreshSubmitState();});

cidade.addEventListener('input',()=>{cidade.value=cidade.value.replace(/^\s+/,'').replace(/\s{2,}/g,' ');markTouched('fieldCidade');refreshSubmitState();});
cidade.addEventListener('blur',()=>{cleanTextField(cidade,true);markTouched('fieldCidade');refreshSubmitState();});

indicado.addEventListener('input',()=>{indicado.value=indicado.value.replace(/^\s+/,'').replace(/\s{2,}/g,' ');markTouched('fieldIndicado');refreshSubmitState();});
indicado.addEventListener('blur',()=>{cleanTextField(indicado,true);markTouched('fieldIndicado');refreshSubmitState();});

observacoes.addEventListener('input',()=>{observacoes.value=observacoes.value.replace(/^\s+/,'').replace(/\s{3,}/g,' ');markTouched('fieldObservacoes');refreshSubmitState();});
observacoes.addEventListener('blur',()=>{observacoes.value=removeExtraSpaces(observacoes.value);markTouched('fieldObservacoes');refreshSubmitState();});

cpf.addEventListener('input',()=>{cpf.value=maskCPF(cpf.value);markTouched('fieldCpf');updatePixPreviews();refreshSubmitState();});
cpf.addEventListener('blur', async () => {

  markTouched('fieldCpf');

  if (modoEdicao) {
    refreshSubmitState();
    return;
  }

  // valida CPF localmente primeiro

  if (!isValidCPF(cpf.value)) {

    cpfError.textContent = 'CPF inválido.';
    btnIrLogin.classList.add('hidden');

    refreshSubmitState();
    return;
  }

  // consulta no Supabase

  const { data, error } = await supabaseClient.rpc(
    'cpf_ja_cadastrado',
    {
      cpf_busca: cpf.value
    }
  );

  if (error) {

    alert(
      'Erro ao verificar CPF: ' +
      error.message
    );

    refreshSubmitState();
    return;
  }

  // CPF já existe

  if (data === true) {

    cpfError.textContent =
      'Este CPF já possui cadastro. Use a área de login para participar das próximas corridas.';

    btnIrLogin.classList.remove('hidden');

    setFieldStatus('fieldCpf', false, true);

    submitBtn.disabled = true;

    return;
  }

  // CPF livre

  btnIrLogin.classList.add('hidden');

  cpfError.textContent = 'CPF inválido.';

  refreshSubmitState();

});
rg.addEventListener('input',()=>{rg.value=maskRG(rg.value);markTouched('fieldRg');refreshSubmitState();});
rg.addEventListener('blur',()=>{rg.value=maskRG(rg.value);markTouched('fieldRg');refreshSubmitState();});

telefone.addEventListener('input',()=>{telefone.value=maskPhone(telefone.value);markTouched('fieldTelefone');updatePixPreviews();refreshSubmitState();});
telefone.addEventListener('blur',()=>{markTouched('fieldTelefone');refreshSubmitState();});

email.addEventListener('input',()=>{email.value=email.value.replace(/\s/g,'').toLowerCase();markTouched('fieldEmail');updatePixPreviews();refreshSubmitState();});
email.addEventListener('blur',()=>{markTouched('fieldEmail');refreshSubmitState();});

nascimento.addEventListener('change',()=>{markTouched('fieldNascimento');refreshSubmitState();});

pixOutro.addEventListener('input',()=>{pixOutro.value=pixOutro.value.replace(/^\s+/,'');markTouched('fieldPixOutro');refreshSubmitState();});
pixOutro.addEventListener('blur',()=>{pixOutro.value=removeExtraSpaces(pixOutro.value);markTouched('fieldPixOutro');refreshSubmitState();});

foto.addEventListener('change',()=>{
  markTouched('fieldFoto');
  const preview=document.getElementById('fotoPreview');
  const previewImg=document.getElementById('fotoPreviewImg');
  const previewText=document.getElementById('fotoPreviewText');
  if(foto.files.length>0 && ['image/jpeg','image/png'].includes(foto.files[0].type)){
    const file=foto.files[0];
    previewImg.src=URL.createObjectURL(file);
    previewText.textContent=`${file.name} • ${(file.size/1024/1024).toFixed(2)} MB`;
    preview.style.display='flex';
  }else{
    preview.style.display='none';
  }
  refreshSubmitState();
});

termos.addEventListener('change',()=>{markTouched('fieldTermos');refreshSubmitState();});

document.querySelectorAll('input[name="pixTipo"]').forEach(radio=>{
  radio.addEventListener('change',()=>{
    const isOutro=document.querySelector('input[name="pixTipo"]:checked').value==='outro';
    document.getElementById('fieldPixOutro').classList.toggle('hidden',!isOutro);
    if(isOutro) markTouched('fieldPixOutro');
    refreshSubmitState();
  });
});


function maskDate(value) {

  value = onlyNumbers(value).slice(0, 8);

  value = value.replace(/(\d{2})(\d)/, '$1/$2');
  value = value.replace(/(\d{2})(\d)/, '$1/$2');

  return value;
}

function dateToDatabase(value) {

  const parts = value.split('/');

  if (parts.length !== 3) return '';

  return `${parts[2]}-${parts[1]}-${parts[0]}`;
}

nascimento.addEventListener('input', () => {

  nascimento.value = maskDate(nascimento.value);

});


form.addEventListener('submit',async function(event){
  event.preventDefault();
  successMessage.style.display='none';

  nome.value=capitalizeName(nome.value);
  cidade.value=capitalizeName(cidade.value);
  indicado.value=capitalizeName(indicado.value);
  observacoes.value=removeExtraSpaces(observacoes.value);
  email.value=removeExtraSpaces(email.value).toLowerCase();
  pixOutro.value=removeExtraSpaces(pixOutro.value);

  if(!termos.checked){alert('Você precisa aceitar os termos para finalizar o cadastro.');return;}
  if(!isFormValid(true)){alert('Revise os campos destacados antes de finalizar o cadastro.');return;}

  submitBtn.disabled=true;
  submitBtn.textContent='Enviando cadastro...';

  try{
    if(SUPABASE_URL==='COLE_AQUI_PROJECT_URL' || SUPABASE_ANON_KEY==='COLE_AQUI_PUBLISHABLE_KEY'){
      throw new Error('Configure a Project URL e a Publishable Key do Supabase no arquivo script.js.');
    }

    const cpfLimpo=onlyNumbers(cpf.value);
    let fotoUrlFinal = fotoAtualUrl;

    if (foto.files.length > 0) {
      const arquivoFoto=foto.files[0];
      const extensao=arquivoFoto.name.split('.').pop().toLowerCase();
      const nomeArquivo=`${cpfLimpo}-${Date.now()}.${extensao}`;
      const caminhoFoto=`staffs/${nomeArquivo}`;

      const uploadFoto=await supabaseClient.storage.from('fotos-staffs').upload(caminhoFoto,arquivoFoto,{cacheControl:'3600',upsert:false});
      if(uploadFoto.error) throw uploadFoto.error;

      const fotoPublica=supabaseClient.storage.from('fotos-staffs').getPublicUrl(caminhoFoto);
      fotoUrlFinal = fotoPublica.data.publicUrl;
    }

    const pixTipo=document.querySelector('input[name="pixTipo"]:checked').value;
    let chavePixFinal='';
    if(pixTipo==='cpf') chavePixFinal=cpf.value;
    if(pixTipo==='email') chavePixFinal=email.value;
    if(pixTipo==='telefone') chavePixFinal=telefone.value;
    if(pixTipo==='outro') chavePixFinal=pixOutro.value;

    const dadosCadastro={nome_completo:nome.value,cpf:cpf.value,rg:rg.value,data_nascimento:dateToDatabase(nascimento.value),telefone:telefone.value,email:email.value,cidade:cidade.value,chave_pix:chavePixFinal,indicado_por:indicado.value,observacoes:observacoes.value,foto_url:fotoUrlFinal};
    const salvarCadastro = modoEdicao
      ? await supabaseClient.from('staffs').update(dadosCadastro).eq('id', staffLogadoEdicao.id).select().single()
      : await supabaseClient.from('staffs').insert([dadosCadastro]);
    if (salvarCadastro.error) {
  const mensagemErro = salvarCadastro.error.message.toLowerCase();

  if (
    mensagemErro.includes('duplicate') ||
    mensagemErro.includes('unique') ||
    mensagemErro.includes('cpf')
  ) {
    throw new Error(
      'Este CPF já está cadastrado. Use a área de login para participar das próximas corridas.'
    );
  }

  throw salvarCadastro.error;
}

    successMessage.textContent = modoEdicao ? 'Cadastro atualizado com sucesso.' : 'Cadastro enviado com sucesso. Os dados foram salvos no Supabase.';
    if (modoEdicao && salvarCadastro.data) {
      localStorage.setItem('staffLogado', JSON.stringify(salvarCadastro.data));
    }
    successMessage.style.display='block';
    successMessage.scrollIntoView({behavior:'smooth',block:'center'});
    if (!modoEdicao) {
      form.reset();
      document.getElementById('fotoPreview').style.display='none';
    }
    touchedFields.clear();
    updatePixPreviews();
  }catch(error){
    alert('Erro ao enviar cadastro: '+error.message);
    console.error(error);
  }finally{
    submitBtn.textContent = modoEdicao ? 'Salvar alterações' : 'Finalizar cadastro';
    refreshSubmitState();
  }
});


function databaseDateToBr(value){
  if(!value) return '';
  const parts = value.split('-');
  if(parts.length !== 3) return value;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function selecionarPixPorValor(staff){
  const chave = staff.chave_pix || '';
  let tipo = 'outro';
  if(chave === staff.cpf) tipo = 'cpf';
  if(chave === staff.email) tipo = 'email';
  if(chave === staff.telefone) tipo = 'telefone';

  const radio = document.querySelector(`input[name="pixTipo"][value="${tipo}"]`);
  if(radio) radio.checked = true;

  const fieldPixOutro = document.getElementById('fieldPixOutro');
  fieldPixOutro.classList.toggle('hidden', tipo !== 'outro');
  pixOutro.value = tipo === 'outro' ? chave : '';
}

async function iniciarModoEdicao(){
  if(!modoEdicao) return;
  if(!staffLogadoEdicao || !staffLogadoEdicao.id){
    window.location.href = 'index.html';
    return;
  }

  document.title = 'Editar cadastro | Sistema Staff';
  const titulo = document.querySelector('.header h1');
  const subtitulo = document.querySelector('.header p');
  if(titulo) titulo.textContent = 'Editar cadastro';
  if(subtitulo) subtitulo.textContent = 'Atualize seus dados de staff. O CPF fica bloqueado para manter o vínculo com suas inscrições.';
  submitBtn.textContent = 'Salvar alterações';
  cpf.disabled = true;
  foto.required = false;
  const helperFoto = document.querySelector('#fieldFoto .error');
  if(helperFoto) helperFoto.textContent = 'Envie uma nova foto somente se quiser trocar a foto atual.';

  const { data, error } = await supabaseClient
    .from('staffs')
    .select('*')
    .eq('id', staffLogadoEdicao.id)
    .single();

  if(error){
    alert('Não foi possível carregar seus dados para edição.');
    console.error(error);
    return;
  }

  nome.value = data.nome_completo || '';
  cpf.value = data.cpf || '';
  rg.value = data.rg || '';
  nascimento.value = databaseDateToBr(data.data_nascimento || '');
  telefone.value = data.telefone || '';
  email.value = data.email || '';
  cidade.value = data.cidade || '';
  indicado.value = data.indicado_por || '';
  observacoes.value = data.observacoes || '';
  fotoAtualUrl = data.foto_url || '';
  termos.checked = true;
  selecionarPixPorValor(data);

  if(fotoAtualUrl){
    const preview=document.getElementById('fotoPreview');
    const previewImg=document.getElementById('fotoPreviewImg');
    const previewText=document.getElementById('fotoPreviewText');
    previewImg.src=fotoAtualUrl;
    previewText.textContent='Foto atual cadastrada';
    preview.style.display='flex';
  }

  updatePixPreviews();
  refreshSubmitState();
}

iniciarModoEdicao();

updatePixPreviews();
refreshSubmitState();
