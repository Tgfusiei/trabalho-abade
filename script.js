const API_KEY = '5fe08bb7bde44a3689876c213ca8dff3';

const btnSearch = document.getElementById('btn-search');
const gameSearchInput = document.getElementById('game-search');
const resultContainer = document.getElementById('result-container');
const errorMessage = document.getElementById('error-message');

// Eventos de clique e tecla Enter
btnSearch.addEventListener('click', verificarJogo);
gameSearchInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') verificarJogo();
});

// Oculta a mensagem de erro assim que o usuário digita algo
gameSearchInput.addEventListener('input', () => {
  errorMessage.classList.add('hidden');
});

async function verificarJogo() {
  const nomeJogo = gameSearchInput.value.trim();
  const userRam = parseFloat(document.getElementById('ram').value) || 0;
  const userVram = parseFloat(document.getElementById('vram').value) || 0;
  const userCpuText = document.getElementById('cpu').value.toLowerCase().trim();

  // Se o campo estiver vazio: exibe o texto e interrompe
  if (!nomeJogo) {
    errorMessage.classList.remove('hidden');
    return;
  }

  // Garante que o texto de erro esteja escondido em uma busca válida
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
    const matchRam = reqText.match(/(?:RAM|memory|system)[^.\d]*?(\d+(?:\.\d+)?)\s*(GB|MB|KB)/i) || 
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

    // --- PARSER ISOLADO DE VRAM (Restrito à linha para não misturar com RAM) ---
    const matchVram = reqText.match(/(?:graphics|video|vga|gpu|vram|card)[^\n\r\d]*?(\d+(?:\.\d+)?)\s*(GB|MB|KB)/i) ||
                      reqText.match(/(\d+(?:\.\d+)?)\s*(GB|MB|KB)[^\n\r]*?(?:vga|gpu|vram|video|graphics)/i);
    
    let requiredVramGb = 0; // Padrão 0 para jogos que não exigem placa dedicada pesada
    
    if (matchVram) {
      const valor = parseFloat(matchVram[1]);
      const unidade = matchVram[2].toUpperCase();
      if (unidade === 'GB') {
        requiredVramGb = valor;
      } else if (unidade === 'MB') {
        requiredVramGb = valor / 1024; // Ex: 256 MB vira 0.25 GB
      } else if (unidade === 'KB') {
        requiredVramGb = valor / (1024 * 1024);
      }
    } else {
      // Caso alternativo para termos genéricos em MB na mesma linha de vídeo
      const matchMbGeneric = reqText.match(/(?:graphics|video|vga|gpu|card)[^\n\r]*?(\d+)\s*mb/i);
      if (matchMbGeneric) {
        requiredVramGb = parseInt(matchMbGeneric[1]) / 1024;
      } else {
        requiredVramGb = 0; 
      }
    }

    // --- LÓGICA DO PROCESSADOR (CPU) ---
    const matchCpu = reqText.match(/(i[3579]|ryzen\s*[3579])/i);
    const requiredCpuTier = matchCpu ? matchCpu[1].toLowerCase().replace(/\s+/g, '') : null;

    const cpuTiers = { 'i3': 1, 'ryzen3': 1, 'i5': 2, 'ryzen5': 2, 'i7': 3, 'ryzen7': 3, 'i9': 4, 'ryzen9': 4 };

    let userCpuLevel = 2;
    for (const [key, val] of Object.entries(cpuTiers)) {
      if (userCpuText.includes(key)) {
        userCpuLevel = val;
        break;
      }
    }

    const requiredCpuLevel = requiredCpuTier && cpuTiers[requiredCpuTier] ? cpuTiers[requiredCpuTier] : 1;

    // Validações finais
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
      if (!temCpu && requiredCpuTier) motivo.push(`CPU ${requiredCpuTier.toUpperCase()}`);

      badge.innerText = `🔴 NÃO RODA (Exige: ${motivo.join(' / ')})`;
      badge.className = "badge danger";
    }

    resultContainer.classList.remove('hidden');

  } catch (error) {
    console.error("Erro na requisição:", error);
  }
}
