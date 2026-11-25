const API_KEY = '5fe08bb7bde44a3689876c213ca8dff3';

const btnSearch = document.getElementById('btn-search');
const gameSearchInput = document.getElementById('game-search');
const resultContainer = document.getElementById('result-container');
const errorMessage = document.getElementById('error-message');
const cpuInput = document.getElementById('cpu');
const cpuDropdown = document.getElementById('cpu-dropdown');

const listaProcessadores = [
  "Intel Core 2 Duo E6600",
  "Intel Core 2 Quad Q6600",
  "Intel Core i3-2100",
  "Intel Core i3-3220",
  "Intel Core i3-4170",
  "Intel Core i3-6100",
  "Intel Core i3-7100",
  "Intel Core i3-8100",
  "Intel Core i3-9100F",
  "Intel Core i3-10100F",
  "Intel Core i3-12100F",
  "Intel Core i3-13100F",
  "Intel Core i5-2400",
  "Intel Core i5-3470",
  "Intel Core i5-4460",
  "Intel Core i5-6400",
  "Intel Core i5-7400",
  "Intel Core i5-8400",
  "Intel Core i5-9400F",
  "Intel Core i5-10400F",
  "Intel Core i5-11400F",
  "Intel Core i5-12400F",
  "Intel Core i5-13400F",
  "Intel Core i7-2600",
  "Intel Core i7-3770",
  "Intel Core i7-4790",
  "Intel Core i7-6700K",
  "Intel Core i7-7700K",
  "Intel Core i7-8700K",
  "Intel Core i7-9700K",
  "Intel Core i7-10700K",
  "Intel Core i7-11700K",
  "Intel Core i7-12700K",
  "Intel Core i7-13700K",
  "Intel Core i9-9900K",
  "Intel Core i9-10900K",
  "Intel Core i9-12900K",
  "Intel Core i9-13900K",
  "AMD Phenom X3 8750",
  "AMD FX-6300",
  "AMD FX-8350",
  "AMD Ryzen 3 1200",
  "AMD Ryzen 3 2200G",
  "AMD Ryzen 3 3200G",
  "AMD Ryzen 3 4100",
  "AMD Ryzen 5 1600",
  "AMD Ryzen 5 2600",
  "AMD Ryzen 5 3600",
  "AMD Ryzen 5 4600G",
  "AMD Ryzen 5 5500",
  "AMD Ryzen 5 5600",
  "AMD Ryzen 5 5600X",
  "AMD Ryzen 5 7600",
  "AMD Ryzen 7 2700X",
  "AMD Ryzen 7 3700X",
  "AMD Ryzen 7 5700X",
  "AMD Ryzen 7 5800X",
  "AMD Ryzen 7 7700X",
  "AMD Ryzen 9 5900X",
  "AMD Ryzen 9 7900X"
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
    // Usa pointerdown para funcionar perfeitamente no toque do celular antes do blur
    li.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      cpuInput.value = cpu;
      cpuDropdown.classList.add('hidden');
    });
    cpuDropdown.appendChild(li);
  });

  cpuDropdown.classList.remove('hidden');
}

// Abre a lista ao tocar no campo e filtra ao digitar
cpuInput.addEventListener('focus', () => renderizarSugestoes(cpuInput.value.trim()));
cpuInput.addEventListener('input', () => renderizarSugestoes(cpuInput.value.trim()));

// Fecha a lista ao clicar/tocar fora
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

function calcularScoreCpu(textoCpu) {
  const texto = textoCpu.toLowerCase().trim();
  if (!texto) return 150;

  const matchModerno = texto.match(/(i[3579]|ryzen\s*[3579])[\s-]*(\d{4,5})?/i);
  
  if (matchModerno) {
    const familia = matchModerno[1].toLowerCase().replace(/\s+/g, '');
    const modeloNum = matchModerno[2] || '';

    const baseScores = {
      'i3': 100, 'ryzen3': 100,
      'i5': 200, 'ryzen5': 200,
      'i7': 300, 'ryzen7': 300,
      'i9': 400, 'ryzen9': 400
    };

    let score = baseScores[familia] || 150;

    if (modeloNum.length === 5) {
      const geracao = parseInt(modeloNum.substring(0, 2));
      score += geracao * 15;
    } else if (modeloNum.length === 4) {
      const geracao = parseInt(modeloNum.substring(0, 1));
      score += geracao * 15;
    } else {
      score += 4 * 15;
    }

    return score;
  }

  if (texto.includes('fx-8') || texto.includes('fx 8')) return 140;
  if (texto.includes('fx-6') || texto.includes('fx 6')) return 120;
  if (texto.includes('core 2 quad') || texto.includes('phenom')) return 70;
  if (texto.includes('core 2 duo') || texto.includes('dual core') || texto.includes('pentium') || texto.includes('athlon')) return 50;

  return 100;
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

    // --- EXTRAÇÃO DO PROCESSADOR EXIGIDO PELO JOGO ---
    const matchCpuReq = reqText.match(/(?:processor|cpu)[^\n\r]*?((?:i[3579]|ryzen\s*[3579])[\s-]*\d{4,5}|i[3579]|ryzen\s*[3579]|fx[\s-]*\d{4}|core\s*2\s*(?:duo|quad)|phenom)/i) ||
                        reqText.match(/((?:i[3579]|ryzen\s*[3579])[\s-]*\d{4,5}|i[3579]|ryzen\s*[3579]|fx[\s-]*\d{4}|core\s*2\s*(?:duo|quad)|phenom)/i);
    
    const requiredCpuText = matchCpuReq ? matchCpuReq[1] : '';
    const requiredCpuScore = requiredCpuText ? calcularScoreCpu(requiredCpuText) : 50;
    const userCpuScore = calcularScoreCpu(userCpuText);

    const temRam = userRam >= requiredRamGb;
    const temVram = userVram >= requiredVramGb;
    const temCpu = userCpuScore >= requiredCpuScore;

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
