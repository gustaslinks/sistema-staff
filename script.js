// =====================================================
// CONFIGURAÇÃO SUPABASE
// EDITE SOMENTE AS 2 LINHAS ABAIXO
// =====================================================
const SUPABASE_URL = "https://klpxoffkajijjktxztmc.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_O_MlVkyfreG125LVia6nag_1GL5bUli";
// NÃO use service_role, direct connection string ou senha do banco.
const MANUAL_LOGOUT_KEY = "sistemaStaffManualLogout";
function limparSessaoLocalSupabase() {
  try {
    localStorage.removeItem("staffLogado");
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith("sb-") || key.includes("supabase.auth")) {
        localStorage.removeItem(key);
      }
    });
  } catch (error) {
    console.warn("Não foi possível limpar sessão local:", error);
  }
}
async function sairDoSistemaSeguro() {
  sessionStorage.setItem(MANUAL_LOGOUT_KEY, "1");
  limparSessaoLocalSupabase();
  try {
    await supabaseClient.auth.signOut({ scope: "global" });
  } catch (error) {
    console.warn("Falha ao encerrar sessão:", error);
  } finally {
    limparSessaoLocalSupabase();
    window.location.replace("index.html?logout=1&t=" + Date.now());
  }
}


const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});

const nome = document.getElementById('nome');
const cpf = document.getElementById('cpf');
const cpfError = document.getElementById('cpfError');
const btnIrLogin = document.getElementById('btnIrLogin');
const rg = document.getElementById('rg');
const nascimento = document.getElementById('nascimento');
const telefone = document.getElementById('telefone');
const email = document.getElementById('email');
const senha = document.getElementById('senha');
const senhaConfirmacao = document.getElementById('senhaConfirmacao');
const cidade = document.getElementById('cidade');
const calcado = document.getElementById('calcado');
const indicado = document.getElementById('indicado');
const pixOutro = document.getElementById('pixOutro');
const foto = document.getElementById('foto');
const fotoCamera = document.getElementById('fotoCamera');
const observacoes = document.getElementById('observacoes');
const termos = document.getElementById('termos');
const form = document.getElementById('staffForm');
const staffIdInput = document.getElementById('staffId');
const staffCpfOriginalInput = document.getElementById('staffCpfOriginal');
const staffNascimentoOriginalInput = document.getElementById('staffNascimentoOriginal');
const successMessage = document.getElementById('successMessage');
const submitBtn = document.getElementById('submitBtn');
const btnVoltarCorridas = document.getElementById('btnVoltarCorridas');
const touchedFields = new Set();
const paramsCadastro = new URLSearchParams(window.location.search);
const modoEdicao = paramsCadastro.get('editar') === '1';
let staffLogadoEdicao = null;
try {
  staffLogadoEdicao = JSON.parse(localStorage.getItem('staffLogado') || 'null');
} catch (error) {
  staffLogadoEdicao = null;
}
const staffIdUrlEdicao = paramsCadastro.get('id');
// Segurança do fluxo de edição:
// - staff comum SEMPRE edita apenas o próprio cadastro salvo no localStorage;
// - id pela URL só é aceito quando o usuário logado é admin.
const isAdminEdicao = !!(staffLogadoEdicao && (staffLogadoEdicao.is_admin === true || staffLogadoEdicao.is_admin === 'true' || staffLogadoEdicao.is_admin === 1 || staffLogadoEdicao.is_admin === '1'));
const staffIdEdicao = modoEdicao
  ? (isAdminEdicao && staffIdUrlEdicao ? staffIdUrlEdicao : (staffLogadoEdicao && staffLogadoEdicao.id ? staffLogadoEdicao.id : null))
  : null;
let fotoAtualUrl = '';
document.body.classList.add(modoEdicao ? 'pagina-editar-cadastro' : 'pagina-cadastro-geral');
const camposSenhaCadastro = document.getElementById('camposSenhaCadastro');
const tituloAcessoCadastro = document.querySelector('.section-title-acesso');
if (modoEdicao) {
  if (camposSenhaCadastro) camposSenhaCadastro.classList.add('hidden');
  if (tituloAcessoCadastro) tituloAcessoCadastro.classList.add('hidden');
}
let staffAtualEdicao = null;
let modoEdicaoAdminCpfAtivo = false;
function isModoAtualizacao(){
  return modoEdicao || modoEdicaoAdminCpfAtivo;
}

function senhaObrigatoria(){
  return !isModoAtualizacao();
}

function senhaValida(){
  if(!senha) return true;
  if(!senhaObrigatoria() && !senha.value) return true;
  return senha.value.length >= 6;
}

function senhaConfirmacaoValida(){
  if(!senhaConfirmacao || !senha) return true;
  if(!senhaObrigatoria() && !senha.value && !senhaConfirmacao.value) return true;
  return senhaConfirmacao.value === senha.value && senhaConfirmacao.value.length >= 6;
}

async function getUsuarioAtual(){
  const { data } = await supabaseClient.auth.getUser();
  return data && data.user ? data.user : null;
}

async function validarSessaoEdicao(){
  if(!modoEdicao) return;
  const user = await getUsuarioAtual();
  if(!user){
    await sairDoSistemaSeguro();
    throw new Error('Sessão expirada. Faça login novamente.');
  }
}

const cardStaffCadastro = document.getElementById('card-staff-cadastro');
const fotoStaffCadastro = document.getElementById('foto-staff-cadastro');
const nomeStaffCadastro = document.getElementById('nome-staff-cadastro');
const cidadeStaffCadastro = document.getElementById('cidade-staff-cadastro');
const emailStaffCadastro = document.getElementById('email-staff-cadastro');
const botaoAdminCadastro = document.getElementById('botao-admin-cadastro');
const botaoCorridasCadastro = document.getElementById('botao-corridas-cadastro');
const botaoSairCadastro = document.getElementById('botao-sair-cadastro');
const adminEditarStaffPanel = document.getElementById('adminEditarStaffPanel');
const adminBuscaCpfStaff = document.getElementById('adminBuscaCpfStaff');
const adminBtnBuscarStaff = document.getElementById('adminBtnBuscarStaff');
const adminBuscaStaffStatus = document.getElementById('adminBuscaStaffStatus');
const accountSecurityPanel = document.getElementById('accountSecurityPanel');
const adminMetaPanel = document.getElementById('adminMetaPanel');
const adminStaffIdInfo = document.getElementById('adminStaffIdInfo');
const adminAuthIdInfo = document.getElementById('adminAuthIdInfo');
const adminUltimoAcessoInfo = document.getElementById('adminUltimoAcessoInfo');
const adminIsAdminCheckbox = document.getElementById('adminIsAdminCheckbox');
const novaSenha = document.getElementById('novaSenha');
const novaSenhaConfirmacao = document.getElementById('novaSenhaConfirmacao');
const btnAlterarSenha = document.getElementById('btnAlterarSenha');
const btnEnviarResetSenha = document.getElementById('btnEnviarResetSenha');
const btnExcluirStaff = document.getElementById('btnExcluirStaff');
const securityStatus = document.getElementById('securityStatus');


function formatarDataHoraBr(value){
  if(!value) return 'Nunca acessou ou não registrado';
  const data = new Date(value);
  if(Number.isNaN(data.getTime())) return value;
  return data.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

function setSecurityStatus(message, type='info'){
  if(!securityStatus) return;
  securityStatus.textContent = message || '';
  securityStatus.className = `login-status ${type}`;
}

function configurarToggleSenha(){
  document.querySelectorAll('[data-toggle-password]').forEach((btn) => {
    const targetId = btn.getAttribute('data-toggle-password');
    const input = document.getElementById(targetId);
    if(!input || btn.dataset.toggleOk === '1') return;
    btn.dataset.toggleOk = '1';
    btn.addEventListener('click', () => {
      const visivel = input.type === 'text';
      input.type = visivel ? 'password' : 'text';
      btn.innerHTML = visivel ? '<span class="password-icon password-icon-eye" aria-hidden="true"></span>' : '<span class="password-icon password-icon-eye-off" aria-hidden="true"></span>';
      btn.classList.toggle('is-visible', !visivel);
      btn.setAttribute('aria-label', visivel ? 'Mostrar senha' : 'Ocultar senha');
    });
  });
}

function renderizarSegurancaCadastro(staff){
  if(!modoEdicao || !accountSecurityPanel) return;
  accountSecurityPanel.classList.remove('hidden');

  const estaEditandoProprioCadastro = staffLogadoEdicao && staff && String(staffLogadoEdicao.id || '') === String(staff.id || '');
  if(btnAlterarSenha) btnAlterarSenha.classList.toggle('hidden', !estaEditandoProprioCadastro);
  if(btnEnviarResetSenha) btnEnviarResetSenha.classList.toggle('hidden', !(isAdminEdicao && staff && staff.email));

  if(isAdminEdicao && adminMetaPanel){
    adminMetaPanel.classList.remove('hidden');
    if(adminStaffIdInfo) adminStaffIdInfo.textContent = staff && staff.id ? staff.id : '-';
    if(adminAuthIdInfo) adminAuthIdInfo.textContent = staff && staff.auth_user_id ? staff.auth_user_id : 'Sem vínculo Auth';
    if(adminUltimoAcessoInfo) adminUltimoAcessoInfo.textContent = formatarDataHoraBr(staff && staff.ultimo_acesso);
    if(adminIsAdminCheckbox) adminIsAdminCheckbox.checked = !!(staff && (staff.is_admin === true || staff.is_admin === 'true'));
    if(btnExcluirStaff) btnExcluirStaff.classList.toggle('hidden', !staff || !staff.id || estaEditandoProprioCadastro);
  }
}

async function alterarSenhaUsuarioLogado(){
  if(!novaSenha || !novaSenhaConfirmacao) return;
  const senha1 = novaSenha.value || '';
  const senha2 = novaSenhaConfirmacao.value || '';
  if(senha1.length < 6){ setSecurityStatus('A nova senha precisa ter pelo menos 6 caracteres.', 'error'); return; }
  if(senha1 !== senha2){ setSecurityStatus('A confirmação da nova senha não confere.', 'error'); return; }
  if(btnAlterarSenha) btnAlterarSenha.disabled = true;
  setSecurityStatus('Alterando senha...', 'info');
  try{
    const { error } = await supabaseClient.auth.updateUser({ password: senha1 });
    if(error) throw error;
    novaSenha.value = '';
    novaSenhaConfirmacao.value = '';
    setSecurityStatus('Senha alterada com sucesso.', 'success');
  }catch(error){
    console.error(error);
    setSecurityStatus('Erro ao alterar senha: ' + error.message, 'error');
  }finally{
    if(btnAlterarSenha) btnAlterarSenha.disabled = false;
  }
}

async function enviarResetSenhaStaff(){
  if(!isAdminEdicao || !staffAtualEdicao || !staffAtualEdicao.email) return;
  if(btnEnviarResetSenha) btnEnviarResetSenha.disabled = true;
  setSecurityStatus('Solicitando reset de senha...', 'info');
  try{
    const redirectTo = window.location.origin + window.location.pathname.replace(/cadastro\.html?$/i, '') + 'alterar-senha.html';
    const { error } = await supabaseClient.auth.resetPasswordForEmail(staffAtualEdicao.email, { redirectTo });
    if(error) throw error;
    setSecurityStatus('Reset solicitado. O envio depende da configuração de e-mail/SMTP do Supabase.', 'success');
  }catch(error){
    console.error(error);
    setSecurityStatus('Erro ao solicitar reset: ' + error.message, 'error');
  }finally{
    if(btnEnviarResetSenha) btnEnviarResetSenha.disabled = false;
  }
}

async function excluirStaffAtual(){
  if(!isAdminEdicao || !staffAtualEdicao || !staffAtualEdicao.id) return;
  const nomeStaff = staffAtualEdicao.nome_completo || 'este staff';
  const confirmar = confirm(`Excluir o cadastro de ${nomeStaff}?\n\nIsso remove inscrições e disponibilidades vinculadas. O usuário Auth pode precisar ser removido manualmente no Supabase Authentication.`);
  if(!confirmar) return;
  if(btnExcluirStaff) btnExcluirStaff.disabled = true;
  setSecurityStatus('Excluindo cadastro...', 'info');
  try{
    const staffId = staffAtualEdicao.id;
    const { data: inscricoes, error: erroInscricoes } = await supabaseClient
      .from('inscricoes')
      .select('id')
      .eq('staff_id', staffId);
    if(erroInscricoes) throw erroInscricoes;
    const inscricaoIds = (inscricoes || []).map(i => i.id);
    if(inscricaoIds.length){
      const delDisp = await supabaseClient.from('inscricao_disponibilidades').delete().in('inscricao_id', inscricaoIds);
      if(delDisp.error) throw delDisp.error;
      const delIns = await supabaseClient.from('inscricoes').delete().eq('staff_id', staffId);
      if(delIns.error) throw delIns.error;
    }
    const delStaff = await supabaseClient.from('staffs').delete().eq('id', staffId);
    if(delStaff.error) throw delStaff.error;
    alert('Cadastro excluído. Se houver usuário Auth vinculado, remova manualmente em Authentication > Users ou implemente a Edge Function de exclusão completa.');
    window.location.href = 'admin.html';
  }catch(error){
    console.error(error);
    setSecurityStatus('Erro ao excluir: ' + error.message, 'error');
  }finally{
    if(btnExcluirStaff) btnExcluirStaff.disabled = false;
  }
}

configurarToggleSenha();
if(btnAlterarSenha) btnAlterarSenha.addEventListener('click', alterarSenhaUsuarioLogado);
if(btnEnviarResetSenha) btnEnviarResetSenha.addEventListener('click', enviarResetSenhaStaff);
if(btnExcluirStaff) btnExcluirStaff.addEventListener('click', excluirStaffAtual);

function renderizarCardLogadoCadastro(){
  if(!cardStaffCadastro) return;

  if(!modoEdicao || !staffLogadoEdicao){
    cardStaffCadastro.classList.add('hidden');
    return;
  }

  cardStaffCadastro.classList.remove('hidden');

  if(fotoStaffCadastro){
    fotoStaffCadastro.src = staffLogadoEdicao.foto_url || 'https://placehold.co/120x120?text=Foto';
  }

  if(nomeStaffCadastro){
    nomeStaffCadastro.textContent = staffLogadoEdicao.nome_completo || 'Staff';
  }

  if(cidadeStaffCadastro){
    cidadeStaffCadastro.textContent = staffLogadoEdicao.cidade ? `Cidade: ${staffLogadoEdicao.cidade}` : 'Cidade não informada';
  }

  if(emailStaffCadastro){
    emailStaffCadastro.textContent = staffLogadoEdicao.email ? `E-mail: ${staffLogadoEdicao.email}` : 'E-mail não informado';
  }

  if(botaoAdminCadastro && isAdminEdicao){
    botaoAdminCadastro.classList.remove('hidden');
  }
}

renderizarCardLogadoCadastro();
configurarBuscaAdminCadastro();

if(botaoAdminCadastro){
  botaoAdminCadastro.addEventListener('click', () => {
    window.location.href = 'admin.html';
  });
}

if(botaoCorridasCadastro){
  botaoCorridasCadastro.addEventListener('click', () => {
    window.location.href = 'corridas.html';
  });
}

if(botaoSairCadastro){
  botaoSairCadastro.addEventListener('click', async () => {
    await sairDoSistemaSeguro();
  });
}

if (btnVoltarCorridas) {
  btnVoltarCorridas.addEventListener('click', () => {
    window.location.href = 'corridas.html';
  });
}


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
    fieldSenha:senhaValida(),
    fieldSenhaConfirmacao:senhaConfirmacaoValida(),
    fieldCidade:cidade.value.trim().length>=2,
    fieldCalcado: calcado ? calcado.value !== "" : true,
    fieldIndicado:indicado.value.trim().length>=2,
    fieldObservacoes:true,
    fieldFoto: modoEdicao ? (!arquivoFotoSelecionado() || arquivoFotoValido()) : arquivoFotoValido(),
    fieldPixOutro:selectedPix!=='outro' || isValidPixOutro(pixOutro.value),
    fieldTermos:termos.checked
  };
  Object.entries(state).forEach(([fieldId,valid])=>{
    const shouldShow=showAll || touchedFields.has(fieldId);
    if(fieldId!=='fieldTermos') setFieldStatus(fieldId,valid,shouldShow);
  });
  return state;
}

function arquivoFotoSelecionado(){
  return (foto && foto.files && foto.files.length > 0) || (fotoCamera && fotoCamera.files && fotoCamera.files.length > 0) || !!(window.StaffPhotoCropper && window.StaffPhotoCropper.getFile && window.StaffPhotoCropper.getFile());
}

function arquivoFotoValido(){
  const arquivo = (window.StaffPhotoCropper && window.StaffPhotoCropper.getFile && window.StaffPhotoCropper.getFile()) || (foto && foto.files && foto.files[0]) || (fotoCamera && fotoCamera.files && fotoCamera.files[0]);
  if(!arquivo) return false;
  return ['image/jpeg','image/png'].includes(arquivo.type);
}

function isFormValid(showAll=false){return Object.values(getValidationState(showAll)).every(Boolean);}

function liberarBotaoEdicao(){
  if (!modoEdicao || !submitBtn) return;
  submitBtn.disabled = false;
  submitBtn.removeAttribute('disabled');
  submitBtn.classList.remove('disabled');
  submitBtn.style.pointerEvents = 'auto';
}

function refreshSubmitState(){
  if (!submitBtn) return;

  // No modo edição, o botão não deve ficar preso à validação em tempo real.
  // A validação completa continua acontecendo no submit, antes de salvar.
  if (modoEdicao) {
    submitBtn.disabled = false;
    submitBtn.removeAttribute('disabled');
    submitBtn.classList.remove('disabled');
    submitBtn.style.pointerEvents = 'auto';
    return;
  }

  submitBtn.disabled = !isFormValid(false);
}
function cleanTextField(input,shouldCapitalize=true){input.value=shouldCapitalize ? capitalizeName(input.value) : removeExtraSpaces(input.value);}

nome.addEventListener('input',()=>{nome.value=nome.value.replace(/^\s+/,'').replace(/\s{2,}/g,' ');markTouched('fieldNome');refreshSubmitState();});
nome.addEventListener('blur',()=>{cleanTextField(nome,true);markTouched('fieldNome');refreshSubmitState();});

cidade.addEventListener('input',()=>{cidade.value=cidade.value.replace(/^\s+/,'').replace(/\s{2,}/g,' ');markTouched('fieldCidade');refreshSubmitState();});
cidade.addEventListener('blur',()=>{cleanTextField(cidade,true);markTouched('fieldCidade');refreshSubmitState();});

indicado.addEventListener('input',()=>{indicado.value=indicado.value.replace(/^\s+/,'').replace(/\s{2,}/g,' ');markTouched('fieldIndicado');refreshSubmitState();});
indicado.addEventListener('blur',()=>{cleanTextField(indicado,true);markTouched('fieldIndicado');refreshSubmitState();});

observacoes.addEventListener('input',()=>{observacoes.value=observacoes.value.replace(/^\s+/,'').replace(/\s{3,}/g,' ');markTouched('fieldObservacoes');refreshSubmitState();});
if (calcado) calcado.addEventListener('change',()=>{markTouched('fieldCalcado');refreshSubmitState();});
observacoes.addEventListener('blur',()=>{observacoes.value=removeExtraSpaces(observacoes.value);markTouched('fieldObservacoes');refreshSubmitState();});
if (senha) senha.addEventListener('input',()=>{markTouched('fieldSenha');markTouched('fieldSenhaConfirmacao');refreshSubmitState();});
if (senhaConfirmacao) senhaConfirmacao.addEventListener('input',()=>{markTouched('fieldSenhaConfirmacao');refreshSubmitState();});

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

async function processarArquivoFoto(inputOrigem){
  markTouched('fieldFoto');
  if(!inputOrigem) { refreshSubmitState(); return; }
  const preview=document.getElementById('fotoPreview');
  const previewImg=document.getElementById('fotoPreviewImg');
  const previewText=document.getElementById('fotoPreviewText');

  const arquivo = inputOrigem.files && inputOrigem.files[0];
  if(arquivo && ['image/jpeg','image/png'].includes(arquivo.type)){
    if(window.StaffPhotoCropper && typeof window.StaffPhotoCropper.open === 'function'){
      const recortada = await window.StaffPhotoCropper.open(arquivo, inputOrigem);
      if(recortada){
        if(previewImg) previewImg.src=URL.createObjectURL(recortada);
        if(previewText) previewText.textContent=`${recortada.name} • ${(recortada.size/1024/1024).toFixed(2)} MB`;
        if(preview) preview.style.display='flex';
      }
    } else {
      if(previewImg) previewImg.src=URL.createObjectURL(arquivo);
      if(previewText) previewText.textContent=`${arquivo.name} • ${(arquivo.size/1024/1024).toFixed(2)} MB`;
      if(preview) preview.style.display='flex';
    }
  }else{
    if(preview) preview.style.display='none';
    if(inputOrigem) inputOrigem.value='';
  }
  refreshSubmitState();
}

if(foto){ foto.addEventListener('change', () => processarArquivoFoto(foto)); }
if(fotoCamera){ fotoCamera.addEventListener('change', () => processarArquivoFoto(fotoCamera)); }

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


form.addEventListener('input', () => {
  if (modoEdicao) refreshSubmitState();
});

form.addEventListener('change', () => {
  if (modoEdicao) refreshSubmitState();
});


function normalizarNumeroCalcadoValor(valor){
  if (valor === null || valor === undefined || valor === '') return null;
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : null;
}

function normalizarTextoBusca(valor){
  return valor === null || valor === undefined ? '' : String(valor).trim();
}

function normalizarCpfSomenteNumeros(valor){
  return normalizarTextoBusca(valor).replace(/\D/g, '');
}

function getCandidatosIdCadastro(){
  const candidatos = [
    staffIdInput && staffIdInput.value,
    staffAtualEdicao && staffAtualEdicao.id,
    staffIdEdicao,
    staffLogadoEdicao && staffLogadoEdicao.id,
    staffIdUrlEdicao
  ];
  return [...new Set(candidatos.map(normalizarTextoBusca).filter(Boolean))];
}

function getCandidatosCpfNascimento(dadosCadastro){
  const candidatos = [
    { cpf: staffCpfOriginalInput && staffCpfOriginalInput.value, nascimento: staffNascimentoOriginalInput && staffNascimentoOriginalInput.value },
    { cpf: staffAtualEdicao && staffAtualEdicao.cpf, nascimento: staffAtualEdicao && staffAtualEdicao.data_nascimento },
    { cpf: staffLogadoEdicao && staffLogadoEdicao.cpf, nascimento: staffLogadoEdicao && staffLogadoEdicao.data_nascimento },
    { cpf: dadosCadastro && dadosCadastro.cpf, nascimento: dadosCadastro && dadosCadastro.data_nascimento }
  ];

  const vistos = new Set();
  return candidatos
    .map(item => ({
      cpf: normalizarTextoBusca(item && item.cpf),
      cpfNumeros: normalizarCpfSomenteNumeros(item && item.cpf),
      nascimento: normalizarTextoBusca(item && item.nascimento)
    }))
    .filter(item => item.cpf && item.nascimento)
    .filter(item => {
      const chave = `${item.cpf}|${item.cpfNumeros}|${item.nascimento}`;
      if (vistos.has(chave)) return false;
      vistos.add(chave);
      return true;
    });
}


async function buscarCadastroPorCpf(cpfValor){
  const cpfFormatado = normalizarTextoBusca(cpfValor);
  const cpfNumeros = normalizarCpfSomenteNumeros(cpfValor);
  if (!cpfFormatado && !cpfNumeros) return null;

  const tentativas = [...new Set([cpfFormatado, cpfNumeros].filter(Boolean))];

  for (const cpfBusca of tentativas) {
    const { data, error } = await supabaseClient
      .from('staffs')
      .select('*')
      .eq('cpf', cpfBusca)
      .limit(1);

    if (error) throw error;
    if (Array.isArray(data) && data.length) return data[0];
  }

  return null;
}

function travarCamposLoginStaffComum(){
  const deveTravar = (modoEdicao || modoEdicaoAdminCpfAtivo) && !isAdminEdicao;
  [cpf, nascimento].forEach((campo) => {
    if (!campo) return;
    campo.disabled = deveTravar;
    campo.classList.toggle('campo-bloqueado-edicao', deveTravar);
  });
}

function preencherFormularioComStaff(data){
  if (!data) return;

  staffAtualEdicao = data;
  if (staffIdInput) staffIdInput.value = data.id || '';
  if (staffCpfOriginalInput) staffCpfOriginalInput.value = data.cpf || '';
  if (staffNascimentoOriginalInput) staffNascimentoOriginalInput.value = data.data_nascimento || '';

  nome.value = data.nome_completo || '';
  cpf.value = data.cpf || '';
  rg.value = data.rg || '';
  nascimento.value = databaseDateToBr(data.data_nascimento || '');
  telefone.value = data.telefone || '';
  email.value = data.email || '';
  cidade.value = data.cidade || '';
  if (calcado) calcado.value = data.numero_calcado || '';
  indicado.value = data.indicado_por || '';
  observacoes.value = data.observacoes || '';
  fotoAtualUrl = data.foto_url || '';
  termos.checked = true;
  selecionarPixPorValor(data);

  const preview=document.getElementById('fotoPreview');
  const previewImg=document.getElementById('fotoPreviewImg');
  const previewText=document.getElementById('fotoPreviewText');
  if(preview && previewImg && previewText){
    if(fotoAtualUrl){
      previewImg.src=fotoAtualUrl;
      previewText.textContent='Foto atual cadastrada';
      preview.style.display='flex';
    }else{
      preview.style.display='none';
    }
  }

  renderizarSegurancaCadastro(data);
  updatePixPreviews();
  refreshSubmitState();
  liberarBotaoEdicao();
  travarCamposLoginStaffComum();
}

function configurarBuscaAdminCadastro(){
  if (!isAdminEdicao || !adminEditarStaffPanel) return;

  adminEditarStaffPanel.classList.remove('hidden');

  if (adminBuscaCpfStaff && !adminBuscaCpfStaff.dataset.listenerConfigurado) {
    adminBuscaCpfStaff.dataset.listenerConfigurado = '1';
    adminBuscaCpfStaff.addEventListener('input', () => {
      adminBuscaCpfStaff.value = maskCPF(adminBuscaCpfStaff.value);
      if (adminBuscaStaffStatus) adminBuscaStaffStatus.textContent = '';
    });
  }

  if (adminBtnBuscarStaff && !adminBtnBuscarStaff.dataset.listenerConfigurado) {
    adminBtnBuscarStaff.dataset.listenerConfigurado = '1';
    adminBtnBuscarStaff.addEventListener('click', async () => {
      const cpfBusca = adminBuscaCpfStaff ? adminBuscaCpfStaff.value : '';

      if (!isValidCPF(cpfBusca)) {
        if (adminBuscaStaffStatus) adminBuscaStaffStatus.textContent = 'Informe um CPF válido para buscar.';
        return;
      }

      adminBtnBuscarStaff.disabled = true;
      adminBtnBuscarStaff.textContent = 'Buscando...';
      if (adminBuscaStaffStatus) adminBuscaStaffStatus.textContent = '';

      try {
        const staffEncontrado = await buscarCadastroPorCpf(cpfBusca);

        if (!staffEncontrado) {
          if (adminBuscaStaffStatus) adminBuscaStaffStatus.textContent = 'Nenhum cadastro encontrado para este CPF.';
          return;
        }

        modoEdicaoAdminCpfAtivo = true;
        preencherFormularioComStaff(staffEncontrado);
        if (submitBtn) submitBtn.textContent = 'Salvar alterações';
        if (adminBuscaStaffStatus) {
          adminBuscaStaffStatus.textContent = `Cadastro carregado: ${staffEncontrado.nome_completo || 'staff sem nome'}.`;
        }
      } catch (error) {
        console.error(error);
        if (adminBuscaStaffStatus) adminBuscaStaffStatus.textContent = 'Erro ao buscar cadastro: ' + error.message;
      } finally {
        adminBtnBuscarStaff.disabled = false;
        adminBtnBuscarStaff.textContent = 'Buscar';
      }
    });
  }
}

async function buscarCadastroPorId(id){
  const idBusca = normalizarTextoBusca(id);
  if (!idBusca) return null;

  const { data, error } = await supabaseClient
    .from('staffs')
    .select('*')
    .eq('id', idBusca)
    .maybeSingle();

  if (error) throw error;
  return data || null;
}

async function buscarCadastroPorCpfNascimento(cpf, nascimento){
  const cpfBusca = normalizarTextoBusca(cpf);
  const cpfNumeros = normalizarCpfSomenteNumeros(cpf);
  const nascimentoBusca = normalizarTextoBusca(nascimento);
  if (!cpfBusca || !nascimentoBusca) return null;

  let consulta = await supabaseClient
    .from('staffs')
    .select('*')
    .eq('cpf', cpfBusca)
    .eq('data_nascimento', nascimentoBusca)
    .maybeSingle();

  if (consulta.error) throw consulta.error;
  if (consulta.data) return consulta.data;

  if (cpfNumeros && cpfNumeros !== cpfBusca) {
    consulta = await supabaseClient
      .from('staffs')
      .select('*')
      .eq('cpf', cpfNumeros)
      .eq('data_nascimento', nascimentoBusca)
      .maybeSingle();

    if (consulta.error) throw consulta.error;
    if (consulta.data) return consulta.data;
  }

  return null;
}

async function buscarCadastroPorEmail(emailBusca){
  const emailNormalizado = normalizarTextoBusca(emailBusca).toLowerCase();
  if (!emailNormalizado) return null;

  const { data, error } = await supabaseClient
    .from('staffs')
    .select('*')
    .ilike('email', emailNormalizado)
    .limit(1);

  if (error) throw error;
  return Array.isArray(data) && data.length ? data[0] : null;
}

async function localizarCadastroParaAtualizacao(dadosCadastro){
  for (const id of getCandidatosIdCadastro()) {
    const encontrado = await buscarCadastroPorId(id);
    if (encontrado) return encontrado;
  }

  for (const combo of getCandidatosCpfNascimento(dadosCadastro)) {
    const encontrado = await buscarCadastroPorCpfNascimento(combo.cpf, combo.nascimento);
    if (encontrado) return encontrado;
  }

  const porEmail = await buscarCadastroPorEmail(dadosCadastro && dadosCadastro.email);
  if (porEmail) return porEmail;

  return null;
}

async function atualizarCadastroExistente(dadosCadastro){
  const cadastroEncontrado = await localizarCadastroParaAtualizacao(dadosCadastro);

  if (!cadastroEncontrado || !cadastroEncontrado.id) {
    console.warn('Cadastro não localizado para atualização.', {
      staffIdInput: staffIdInput && staffIdInput.value,
      staffAtualEdicao,
      staffIdEdicao,
      staffLogadoEdicao,
      cpfFormulario: dadosCadastro && dadosCadastro.cpf,
      nascimentoFormulario: dadosCadastro && dadosCadastro.data_nascimento
    });
    throw new Error('Não foi possível localizar o cadastro para atualização. Faça login novamente e tente outra vez.');
  }

  const idBusca = normalizarTextoBusca(cadastroEncontrado.id);
  const dadosUpdate = { ...dadosCadastro };

  // Staff comum não pode alterar a chave de login provisória.
  // Admin pode corrigir CPF e nascimento do cadastro carregado.
  if (!isAdminEdicao) {
    dadosUpdate.cpf = cadastroEncontrado.cpf || dadosCadastro.cpf;
    dadosUpdate.data_nascimento = cadastroEncontrado.data_nascimento || dadosCadastro.data_nascimento;
  }

  const { data, error } = await supabaseClient
    .from('staffs')
    .update(dadosUpdate)
    .eq('id', idBusca)
    .select('*')
    .maybeSingle();

  if (error) {
    console.error('Erro Supabase ao atualizar cadastro por ID:', error);
    throw error;
  }

  let cadastroSalvo = data || await buscarCadastroPorId(idBusca);

  if (!cadastroSalvo || !cadastroSalvo.id) {
    throw new Error('O cadastro foi localizado, mas o Supabase não retornou a linha atualizada. Recarregue a página e tente novamente.');
  }

  // Não bloqueia o salvamento só por divergência de leitura do número do calçado.
  // Esse campo já é enviado como INT para numero_calcado; se houver cache/permissão
  // no Supabase, o alerta deve vir do erro real do update, não de uma validação falsa.
  if (normalizarNumeroCalcadoValor(cadastroSalvo.numero_calcado) !== normalizarNumeroCalcadoValor(dadosCadastro.numero_calcado)) {
    console.warn('Cadastro salvo, mas numero_calcado retornou diferente do enviado.', {
      id: idBusca,
      enviado: dadosCadastro.numero_calcado,
      retornado: cadastroSalvo.numero_calcado,
      cadastroSalvo
    });
  }

  return cadastroSalvo;
}

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
  submitBtn.textContent = isModoAtualizacao() ? 'Salvando alterações...' : 'Enviando cadastro...';

  try{
    if(SUPABASE_URL==='COLE_AQUI_PROJECT_URL' || SUPABASE_ANON_KEY==='COLE_AQUI_PUBLISHABLE_KEY'){
      throw new Error('Configure a Project URL e a Publishable Key do Supabase no arquivo script.js.');
    }

    const cpfLimpo=onlyNumbers(cpf.value);
    let fotoUrlFinal = fotoAtualUrl;

    if (arquivoFotoSelecionado()) {
      const arquivoFoto=(window.StaffPhotoCropper && window.StaffPhotoCropper.getFile && window.StaffPhotoCropper.getFile()) || (foto && foto.files && foto.files[0]) || (fotoCamera && fotoCamera.files && fotoCamera.files[0]);
      const extensao=arquivoFoto.type === 'image/jpeg' ? 'jpg' : (arquivoFoto.name.split('.').pop().toLowerCase() || 'jpg');
      const nomeArquivo=`${cpfLimpo}-${Date.now()}.${extensao}`;
      const caminhoFoto=`staffs/${nomeArquivo}`;

      const uploadFoto=await supabaseClient.storage.from('fotos-staffs').upload(caminhoFoto,arquivoFoto,{cacheControl:'3600',upsert:false,contentType:arquivoFoto.type || 'image/jpeg'});
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

    const dadosCadastro={nome_completo:nome.value,cpf:cpf.value,rg:rg.value,data_nascimento:dateToDatabase(nascimento.value),telefone:telefone.value,email:email.value,cidade:cidade.value,numero_calcado: calcado ? (calcado.value ? Number(calcado.value) : null) : null,chave_pix:chavePixFinal,indicado_por:indicado.value,observacoes:observacoes.value || null,foto_url:fotoUrlFinal};
    if (isAdminEdicao && adminIsAdminCheckbox) {
      dadosCadastro.is_admin = adminIsAdminCheckbox.checked;
    }
    let cadastroSalvo = null;

    if (isModoAtualizacao()) {
      cadastroSalvo = await atualizarCadastroExistente(dadosCadastro);


      staffAtualEdicao = cadastroSalvo;
      if (staffIdInput) staffIdInput.value = cadastroSalvo.id || '';
      if (staffCpfOriginalInput) staffCpfOriginalInput.value = cadastroSalvo.cpf || '';
      if (staffNascimentoOriginalInput) staffNascimentoOriginalInput.value = cadastroSalvo.data_nascimento || '';
      renderizarSegurancaCadastro(cadastroSalvo);
    } else {
      if (!senhaValida() || !senhaConfirmacaoValida()) {
        throw new Error('Crie uma senha com pelo menos 6 caracteres e confirme a senha corretamente.');
      }

      const authCadastro = await supabaseClient.auth.signUp({
        email: email.value,
        password: senha.value
      });

      if (authCadastro.error) {
        const msg = authCadastro.error.message || '';
        if (msg.toLowerCase().includes('already')) {
          throw new Error('Este e-mail já possui usuário de acesso. Faça login ou use outro e-mail.');
        }
        throw authCadastro.error;
      }

      const usuarioAuth = authCadastro.data && authCadastro.data.user;
      if (!usuarioAuth || !usuarioAuth.id) {
        throw new Error('Usuário de acesso criado, mas não foi possível identificar o ID do Auth. Verifique as configurações de confirmação de e-mail no Supabase.');
      }

      dadosCadastro.auth_user_id = usuarioAuth.id;

      const inserirCadastro = await supabaseClient
        .from('staffs')
        .insert([dadosCadastro])
        .select('*')
        .maybeSingle();

      if (inserirCadastro.error) {
        const mensagemErro = inserirCadastro.error.message.toLowerCase();

        if (
          mensagemErro.includes('duplicate') ||
          mensagemErro.includes('unique') ||
          mensagemErro.includes('cpf')
        ) {
          throw new Error('Este CPF já está cadastrado. Use a área de login para participar das próximas corridas.');
        }

        throw inserirCadastro.error;
      }

      cadastroSalvo = inserirCadastro.data;

      if (!cadastroSalvo) {
        const buscarCadastro = await supabaseClient
          .from('staffs')
          .select('*')
          .eq('cpf', cpf.value)
          .eq('data_nascimento', dateToDatabase(nascimento.value))
          .maybeSingle();

        if (buscarCadastro.error) throw buscarCadastro.error;
        cadastroSalvo = buscarCadastro.data;
      }
    }

    if (!cadastroSalvo) {
      throw new Error('Cadastro salvo, mas não foi possível carregar os dados de acesso. Tente fazer login.');
    }

    const staffLogadoAtual = (() => {
      try { return JSON.parse(localStorage.getItem('staffLogado') || 'null'); } catch (e) { return null; }
    })();

    const deveAtualizarSessao = !modoEdicao || !staffLogadoAtual || String(staffLogadoAtual.id || '') === String(cadastroSalvo.id || '');

    if (deveAtualizarSessao) {
      localStorage.setItem('staffLogado', JSON.stringify({
        ...cadastroSalvo,
        is_admin: cadastroSalvo.is_admin === true || cadastroSalvo.is_admin === 'true'
      }));
    }

    successMessage.textContent = isModoAtualizacao() ? 'Cadastro atualizado com sucesso.' : 'Cadastro enviado com sucesso. Redirecionando para as corridas...';
    successMessage.style.display='block';
    successMessage.scrollIntoView({behavior:'smooth',block:'center'});

    setTimeout(() => {
      window.location.href = 'corridas.html';
    }, isModoAtualizacao() ? 500 : 600);
    return;
  }catch(error){
    alert('Erro ao enviar cadastro: '+error.message);
    console.error(error);
  }finally{
    submitBtn.textContent = isModoAtualizacao() ? 'Salvar alterações' : 'Finalizar cadastro';
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
  await validarSessaoEdicao();
  if(!staffIdEdicao){
    window.location.href = 'index.html';
    return;
  }

  document.title = 'Editar cadastro | Sistema Staff';
  const titulo = document.querySelector('.header h1');
  const subtitulo = document.querySelector('.header p');
  if(titulo) titulo.textContent = 'Editar cadastro';
  if(subtitulo) subtitulo.textContent = isAdminEdicao ? 'Atualize seu cadastro ou busque outro staff por CPF para editar nesta mesma tela.' : 'Atualize seus dados de staff. CPF e data de nascimento ficam bloqueados para manter seu acesso seguro.';
  submitBtn.textContent = 'Salvar alterações';
  if (btnVoltarCorridas) btnVoltarCorridas.classList.remove('hidden');
  liberarBotaoEdicao();
  travarCamposLoginStaffComum();
  foto.required = false;
  if (fotoCamera) fotoCamera.required = false;
  const helperFoto = document.querySelector('#fieldFoto .error');
  if(helperFoto) helperFoto.textContent = 'Envie uma nova foto somente se quiser trocar a foto atual.';

  const { data, error } = await supabaseClient
    .from('staffs')
    .select('*')
    .eq('id', staffIdEdicao)
    .maybeSingle();

  if(error || !data){
    alert('Não foi possível carregar seus dados para edição. Faça login novamente.');
    console.error(error);
    return;
  }

  preencherFormularioComStaff(data);
  configurarBuscaAdminCadastro();
}


iniciarModoEdicao().finally(() => {
  if (modoEdicao) {
    refreshSubmitState();
    liberarBotaoEdicao();
    setTimeout(liberarBotaoEdicao, 50);
    setTimeout(liberarBotaoEdicao, 300);
  }
});

updatePixPreviews();
refreshSubmitState();


// v2.4 - login por CPF, sessão persistente, controles de senha e segurança admin.
