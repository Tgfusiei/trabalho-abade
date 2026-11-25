const API_KEY = '5fe08bb7bde44a3689876c213ca8dff3';

const btnSearch = document.getElementById('btn-search');
const gameSearchInput = document.getElementById('game-search');
const resultContainer = document.getElementById('result-container');
const errorMessage = document.getElementById('error-message');
const cpuInput = document.getElementById('cpu');
const cpuDropdown = document.getElementById('cpu-dropdown');

// Lista limpa focada nas famílias principais de processadores
const listaProcessadores = [
  "Intel Core 2 Duo",
  "Intel Core i3",
  "Intel Core i5",
  "Intel Core i7",
  "Intel Core i9",
  "AMD Phenom",
  "AMD FX",
  "AMD Ryzen 3",
  "AMD Ryzen 5",
  "AMD Ryzen 7",
  "AMD Ryzen 9"
];

function renderizarSugestoes(termo = '') {
  cpuDropdown.innerHTML = '';
  const filtrados = termo
    ? listaProcessadores.filter(cpu => cpu.toLowerCase().includes(termo.toLowerCase()))
    : listaProcessadores;

  if (filtrados.length === 0) {
    cpuDropdown.classList.add('hidden');
    return;
  }

  filtrados.forEach(cpu => {
    const li = document.createElement('li');
    li.textContent = cpu;
    li.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      cpuInput.value = cpu;
      cpuDropdown.classList.add('hidden');
    });
    cpuDropdown.appendChild(li);
  });

  cpuDropdown.classList.remove('hidden');
}

cpuInput.addEventListener('focus', () => renderizarSugestoes(cpuInput.value.trim()));
cpuInput.addEventListener('input', () => renderizarSugestoes(cpuInput.value.trim()));

document.addEventListener('pointerdown', (e) => {
  if (!e.target.closest('.autocomplete-wrapper')) {
    cpuDropdown.classList.add('hidden');
  }
});

btnSearch.addEventListener('click', verificarJogo);
gameSearchInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') verificarJogo();
});

gameSearchInput.addEventListener('input', () => {
  errorMessage.classList.add('hidden');
});

// Lógica de pontuação por nível de família de CPU
function calcularScoreCpu(textoCpu) {
  const texto = textoCpu.toLowerCase().trim();
  if (!texto) return 2;

  const cpuTiers = {
    'core 2': 1,
    'phenom': 1,
    'fx': 1,
    'i3': 2,
    'ryzen 3': 2,
    'i5': 3,
    'ryzen 5': 3,
    'i7': 4,
    'ryzen 7': 4,
    'i9': 5,
    'ryzen 9': 5
  };

  for (const [key, val] of Object.entries(cpuTiers)) {
    if (texto.includes(key)) {
      return val;
    }
  }

  return 2; // Padrão intermediário seguro
}

async function verificarJogo() {
  const nomeJogo = gameSearchInput.value.trim();
  const userRam = parseFloat(document.getElementById('ram').value) || 0;
  const userVram = parseFloat(document.getElementById('vram').value) || 0;
  const userCpuText = cpuInput.value;

  if (!nomeJogo) {
    errorMessage.classList.remove('hidden');
    return;
  }

  errorMessage.classList.add('hidden');

  try {
    const response = await fetch(`https://api.rawg.io/api/games?key=${API_KEY}&search=${encodeURIComponent(nomeJogo)}`);
    const data = await response.json();

    if (!data.results || data.results.length === 0) {
      return;
    }

    const jogo = data.results[0];

    const reqResponse = await fetch(`https://api.rawg.io/api/games/${jogo.id}?key=${API_KEY}`);
    const jogoDetalhes = await reqResponse.json();

    const pcPlatform = jogoDetalhes.platforms?.find(p => p.platform.id === 4);
    const reqText = pcPlatform?.requirements?.minimum || "Requisitos não informados.";

    // --- PARSER ISOLADO DE RAM ---
    const matchRam = reqText.match(/(?:RAM|memory|system)[^\n\r\d]*?(\d+(?:\.\d+)?)\s*(GB|MB|KB)/i) || 
                      reqText.match(/(\d+(?:\.\d+)?)\s*(GB|MB|KB)\s*(?:RAM|memory)/i) ||
                      reqText.match(/(\d+(?:\.\d+)?)\s*GB/i);
    let requiredRamGb = 4;
    
    if (matchRam) {
      const valor = parseFloat(matchRam[1]);
      const unidade = (matchRam[2] || 'GB').toUpperCase();
      if (unidade === 'GB') requiredRamGb = valor;
      else if (unidade === 'MB') requiredRamGb = valor / 1024;
      else if (unidade === 'KB') requiredRamGb = valor / (1024 * 1024);
    }

    // --- PARSER ISOLADO DE VRAM ---
    const matchVram = reqText.match(/(?:graphics|video|vga|gpu|vram|card)[^\n\r\d]*?(\d+(?:\.\d+)?)\s*(GB|MB|KB)/i) ||
                      reqText.match(/(\d+(?:\.\d+)?)\s*(GB|MB|KB)[^\n\r]*?(?:vga|gpu|vram|video|graphics)/i);
    
    let requiredVramGb = 0;
    
    if (matchVram) {
      const valor = parseFloat(matchVram[1]);
      const unidade = matchVram[2].toUpperCase();
      if (unidade === 'GB') requiredVramGb = valor;
      else if (unidade === 'MB') requiredVramGb = valor / 1024;
      else if (unidade === 'KB') requiredVramGb = valor / (1024 * 1024);
    }

    // --- EXTRAÇÃO DA CPU EXIGIDA PELO JOGO ---
    const matchCpuReq = reqText.match(/(i[3579]|ryzen\s*[3579]|fx[\s-]*\d{4}|core\s*2\s*(?:duo|quad)|phenom)/i);
    const requiredCpuText = matchCpuReq ? matchCpuReq[1] : '';
    const requiredCpuLevel = requiredCpuText ? calcularScoreCpu(requiredCpuText) : 1;
    const userCpuLevel = calcularScoreCpu(userCpuText);

    const temRam = userRam >= requiredRamGb;
    const temVram = userVram >= requiredVramGb;
    const temCpu = userCpuLevel >= requiredCpuLevel;

    const roda = temRam && temVram && temCpu;

    document.getElementById('game-title').innerText = jogo.name;
    document.getElementById('game-image').src = jogo.background_image || '';
    document.getElementById('game-requirements').innerText = reqText;

    const badge = document.getElementById('status-badge');
    if (roda) {
      badge.innerText = "🟢 RODA NO SEU PC";
      badge.className = "badge success";
    } else {
      let motivo = [];
      if (!temRam) motivo.push(`${Math.ceil(requiredRamGb)}GB RAM`);
      if (!temVram) motivo.push(`${requiredVramGb < 1 ? Math.round(requiredVramGb * 1024) + 'MB' : requiredVramGb + 'GB'} VRAM`);
      if (!temCpu && requiredCpuText) motivo.push(`CPU ${requiredCpuText.toUpperCase()}`);

      badge.innerText = `🔴 NÃO RODA (Exige: ${motivo.join(' / ')})`;
      badge.className = "badge danger";
    }

    resultContainer.classList.remove('hidden');

  } catch (error) {
    console.error("Erro na requisição:", error);
  }
}
