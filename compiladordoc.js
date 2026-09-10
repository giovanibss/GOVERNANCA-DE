/* ══════════════════════════════════════════════════════════════
   MOTOR UNIFICADO DE COMPILAÇÃO DE DOCUMENTOS (OS, OMIS, GRATIREP & AUXÍLIO TRANSPORTE)
   compiladordoc.js — Governança DE (AFA/DE)
   ══════════════════════════════════════════════════════════════ */

const CompiladorDoc = (function() {
  const MESES = ['JANEIRO','FEVEREIRO','MARÇO','ABRIL','MAIO','JUNHO','JULHO','AGOSTO','SETEMBRO','OUTUBRO','NOVEMBRO','DEZEMBRO'];
  const MESES_MIN = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
  const SEMANA = ['DOM.','SEG.','TER.','QUA.','QUI.','SEX.','SÁB.'];

  function rotuloComp(comp) {
    const [a, m] = comp.split('-').map(Number);
    return MESES[m - 1] + '/' + a;
  }

  function mesAbreviado(comp) {
    const [a, m] = comp.split('-').map(Number);
    return MESES[m - 1].substring(0, 3);
  }

  function fmtBRL(v) {
    return (v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  const logoAfa = 'assets/brasao-afa.jpg';
  const logoFab = 'assets/cocar-fab.png';
  /* Na OMIS: brasão da Divisão de Ensino à esquerda, brasão da AFA à direita. */
  const logoDe = 'assets/brasao-de.png';

  const estiloBase = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Inter',Arial,sans-serif;color:#0a1730;background:#fff;padding:10mm 12mm;font-size:8.5pt;line-height:1.2}
    h1{font-size:11pt;font-weight:700;text-transform:uppercase;text-align:center;margin-bottom:2mm}
    .cab-doc{display:flex;align-items:center;justify-content:space-between;border:1.5pt solid #0a1730;padding:3mm 4mm;margin-bottom:4mm;gap:4mm}
    .cab-doc .logo-area{display:flex;flex-direction:column;gap:1mm;font-size:7pt;color:#333;text-align:center;min-width:20mm}
    .cab-doc .logo-area img{width:16mm;height:16mm;object-fit:contain;margin:0 auto}
    .cab-doc .titulo-area{flex:1;text-align:center}
    .cab-doc .titulo-area h1{font-size:10pt;margin-bottom:1mm}
    .cab-doc .titulo-area p{font-size:8pt;color:#333}
    .cab-doc .mes-area{font-size:14pt;font-weight:700;text-align:center;min-width:28mm;border-left:1pt solid #ccc;padding-left:4mm}
    table{width:100%;border-collapse:collapse;font-size:8pt}
    th{background:#0a1730;color:#fff;font-size:7.5pt;text-transform:uppercase;letter-spacing:.06em;padding:1.8mm 2mm;text-align:left}
    td{padding:1.5mm 2mm;border-bottom:.5pt solid #dbe4f0}
    tr:nth-child(even) td{background:#f5f7fa}
    tr:last-child td{border-bottom:1.5pt solid #0a1730}
    .rodape{margin-top:6mm;font-size:7pt;color:#555;text-align:center}
    .quebra-pagina{page-break-after:always;break-after:page}
    @media print{
      @page{size:A4 portrait;margin:8mm}
      body{padding:0}
      .nao-imprimir{display:none!important}
    }
  `;

  function baixarHtml(html, nomeArquivo) {
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nomeArquivo;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 3000);
  }

  function limparNumOs(num) {
    if (!num) return 'OS';
    return String(num).trim().replace(/\//g, '.').replace(/\\/g, '.');
  }

  function fmtDataIso(iso) {
    if (!iso) return '—';
    const [a, m, d] = String(iso).split('-');
    if (!d || !m || !a) return iso;
    return `${d}/${m}/${a}`;
  }

  function dataPorExtenso(iso) {
    if (!iso) {
      const h = new Date();
      return `${h.getDate()} de ${MESES_MIN[h.getMonth()]} de ${h.getFullYear()}`;
    }
    const [a, m, d] = String(iso).split('-').map(Number);
    if (!d || !m || !a) return iso;
    return `${String(d).padStart(2, '0')} de ${MESES_MIN[m - 1]} de ${a}`;
  }

  function extrairMilitares(d) {
    if (Array.isArray(d.militares) && d.militares.length > 0) {
      return d.militares.map((m, idx) => {
        const postoGrad = (m.posto_grad || m.posto || '').trim();
        const esp = (m.especialidade || m.esp || '').trim();
        const nomeCompleto = (m.nome_completo || m.nome || '').trim();
        const nomeGuerra = (m.nome_guerra || m.guerra || (nomeCompleto.split(' ').length > 1 ? nomeCompleto.split(' ')[0] + ' ' + nomeCompleto.split(' ').pop() : nomeCompleto)).trim();
        
        return {
          ordem: idx + 1,
          posto_grad: postoGrad,
          especialidade: esp,
          nome: nomeCompleto,
          nome_guerra: nomeGuerra,
          cpf: m.cpf || '',
          saram: m.saram || '',
          om: m.om || 'AFA',
          data_inicio: m.data_inicio || d.data_inicio || '',
          hora_inicio: m.hora_inicio || d.hora_inicio || '04:00',
          data_fim: m.data_fim || d.data_fim || '',
          hora_fim: m.hora_fim || d.hora_fim || '16:00',
          data_inicio_fmt: fmtDataIso(m.data_inicio || d.data_inicio),
          data_fim_fmt: fmtDataIso(m.data_fim || d.data_fim),
          dias: m.dias || d.dias || 1,
          passagem: m.passagem || d.passagem || 'NÃO',
          retorno_inicio_fmt: fmtDataIso(m.retorno_inicio || m.data_inicio || d.data_inicio),
          retorno_hora_inicio: m.retorno_hora_inicio || m.hora_inicio || d.hora_inicio || '04:00',
          retorno_fim_fmt: fmtDataIso(m.retorno_fim || m.data_fim || d.data_fim),
          retorno_hora_fim: m.retorno_hora_fim || m.hora_fim || d.hora_fim || '16:00',
          dias_retorno: m.dias_retorno || m.dias || d.dias || 1
        };
      });
    }
    const postoGrad = (d.posto_grad || '').trim();
    const esp = (d.especialidade || '').trim();
    const nomeCompleto = (d.nome || '').trim();
    return [{
      ordem: 1,
      posto_grad: postoGrad,
      especialidade: esp,
      nome: nomeCompleto,
      nome_guerra: d.nome_guerra || nomeCompleto,
      cpf: d.cpf || '',
      saram: d.saram || '',
      om: d.om || 'AFA',
      data_inicio: d.data_inicio || '',
      hora_inicio: d.hora_inicio || '04:00',
      data_fim: d.data_fim || '',
      hora_fim: d.hora_fim || '16:00',
      data_inicio_fmt: fmtDataIso(d.data_inicio),
      data_fim_fmt: fmtDataIso(d.data_fim),
      dias: d.dias || 1,
      passagem: d.passagem || 'NÃO',
      retorno_inicio_fmt: fmtDataIso(d.retorno_inicio || d.data_inicio),
      retorno_hora_inicio: d.retorno_hora_inicio || d.hora_inicio || '04:00',
      retorno_fim_fmt: fmtDataIso(d.retorno_fim || d.data_fim),
      retorno_hora_fim: d.retorno_hora_fim || d.hora_fim || '16:00',
      dias_retorno: d.dias_retorno || d.dias || 1
    }];
  }

  function getOsConfig() {
    if (window.AppConfig && typeof window.AppConfig.getOsConfig === 'function') {
      return window.AppConfig.getOsConfig();
    }
    return {
      omis_autoridade_nome: 'Odilor da Silva Lopes Cel Int R1',
      omis_autoridade_cargo: 'Adjunto da Divisão de Ensino da AFA',
      grat_os_autoridade_nome: 'Cel QOINT WELLINGTON MARCELO FERNANDES',
      grat_os_autoridade_cargo: 'Chefe da Divisão Administrativa',
      grat_aut_autoridade_nome: 'GABRIEL HENRIQUES DE OLIVEIRA FARIAS Cel Av',
      grat_aut_autoridade_cargo: 'Chefe da 2SC',
      grat_aut_cidade: 'Brasilia-DF'
    };
  }

  // ══════════════════════════════════════════════════════════════
  // ESTILOS OFICIAIS DOS DOCUMENTOS DE OS / OMIS / GRATIREP
  // ══════════════════════════════════════════════════════════════
  function estiloOficialOS() {
    return `
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Oswald:wght@500;600;700&family=JetBrains+Mono:wght@500;600&display=swap');
      *{box-sizing:border-box;margin:0;padding:0}
      body{font-family:'Inter',Arial,sans-serif;color:#000;background:#fff;padding:8mm 12mm;font-size:8.5pt;line-height:1.3}
      
      .header-container{border:1.2pt solid #000;padding:3mm 4mm;margin-bottom:3mm;display:flex;align-items:center;justify-content:space-between;gap:3mm}
      .header-logo{width:18mm;height:18mm;object-fit:contain}
      .header-title-box{flex:1;text-align:center}
      .header-title-box h1{font-size:9.5pt;font-weight:700;text-transform:uppercase;margin-bottom:1mm;line-height:1.2}
      .header-title-box h2{font-size:8.5pt;font-weight:700;text-transform:uppercase;color:#222}
      .header-doc-num{font-size:9pt;font-weight:700;text-transform:uppercase;margin-top:2mm;border-top:1pt solid #000;display:inline-block;padding-top:1mm}

      .table-doc{width:100%;border-collapse:collapse;margin:2mm 0 3mm 0;font-size:8pt}
      .table-doc th, .table-doc td{border:1pt solid #000;padding:1.6mm 2mm;text-align:center;vertical-align:middle}
      .table-doc th{background:#eef2f7;font-weight:700;text-transform:uppercase;font-size:7.2pt;letter-spacing:.02em}
      .table-doc td.left{text-align:left}

      .box-field{border:1pt solid #000;padding:2mm 2.5mm;margin-bottom:2mm;font-size:8pt;background:#fff}
      .box-field strong{display:inline-block;margin-bottom:.8mm;font-size:8pt;text-transform:uppercase}

      .sec-header{font-weight:700;font-size:8.2pt;text-transform:uppercase;margin:2.5mm 0 1mm 0}
      .check-box{display:inline-block;width:11px;height:11px;border:1pt solid #000;text-align:center;line-height:9px;font-size:7.5pt;font-weight:700;margin-right:2px}

      .signatures-grid{display:grid;grid-template-columns:1fr 1fr;gap:4mm;margin-top:8mm;font-size:8pt}
      .sig-box{text-align:center}
      .sig-box .line{margin-top:14mm;border-top:1pt solid #000;padding-top:1.5mm;font-weight:700;text-transform:uppercase}
      .sig-box small{display:block;font-size:7.5pt;font-weight:400;color:#333;margin-top:1px}

      .ass-digital-tag{font-size:7.5pt;color:#555;font-style:italic;margin-bottom:1mm}

      .single-signature{margin-top:12mm;text-align:center;font-size:8.5pt}
      .single-signature .name{font-weight:700;text-transform:uppercase;margin-top:1mm}

      @media print{
        @page{size:A4 portrait;margin:8mm}
        body{padding:0}
        .nao-imprimir{display:none!important}
      }
    `;
  }

  // ══════════════════════════════════════════════════════════════
  // 1. ORDEM DE MISSÃO (OMIS)
  // Modelos: OMIS 24.DE.2026 / OMIS 25.DE.2026
  // ══════════════════════════════════════════════════════════════

  /* Estilo exclusivo da Ordem de Missão — reproduz o formulário
     preenchido à mão hoje: moldura externa única e contínua,
     sem caixas soltas nem espaçamento entre blocos. */
  function estiloOmisOficial() {
    return `
      @import url('https://fonts.googleapis.com/css2?family=Arial&display=swap');
      *{box-sizing:border-box;margin:0;padding:0}
      body{font-family:Arial,Helvetica,sans-serif;color:#000;background:#fff;
           padding:10mm 12mm;font-size:8.5pt;line-height:1.25}

      .folha{border:1pt solid #000}

      .omis-topo{display:flex;align-items:center;justify-content:space-between;
                 gap:4mm;padding:3mm 5mm 1mm 5mm}
      .omis-topo img{width:19mm;height:19mm;object-fit:contain;flex-shrink:0}
      .omis-titulos{flex:1;text-align:center}
      .omis-titulos div{font-size:10pt;font-weight:700;text-transform:uppercase;line-height:1.3}
      .omis-numero{text-align:center;font-size:9.5pt;font-weight:700;text-transform:uppercase;
                   padding:2mm 0 3mm 0}
      .omis-numero span{border-bottom:1pt solid #000;padding-bottom:.4mm}

      table.omis{width:100%;border-collapse:collapse;table-layout:fixed}
      table.omis td, table.omis th{border:1pt solid #000;padding:1.2mm 2mm;color:#000;
        font-size:8pt;text-align:center;vertical-align:middle;word-wrap:break-word}
      table.omis th{background:#d9d9d9;font-weight:700;text-transform:uppercase;font-size:7.6pt}
      table.omis td.esq, table.omis th.esq{text-align:left}
      table.omis tr.faixa th{background:#d9d9d9;font-size:8.2pt;letter-spacing:.02em}
      table.omis tr.vao td{border-left:none;border-right:none;border-top:none;
        border-bottom:none;height:2.6mm;padding:0}
      table.omis td.item{text-align:left;font-size:8pt;font-weight:700;text-transform:uppercase}
      table.omis td.item span{font-weight:400;text-transform:none}
      table.omis td.linha-livre{height:7.5mm}
      table.omis td.rodape{text-align:left;font-size:8pt;padding:3mm 2mm;vertical-align:bottom;
        height:18mm;white-space:nowrap}
      table.omis td.assina{text-align:center;font-size:8pt;padding:2mm;vertical-align:bottom;height:16mm}
      .risco{display:inline-block;border-bottom:1pt solid #000;min-width:18mm}
      .assina-linha{border-top:1pt solid #000;width:76%;margin:0 auto 1.2mm auto;height:0}
      .assina-nome{font-weight:700;text-transform:uppercase;font-size:8pt}
      .assina-cargo{font-size:7.5pt}
      .assina-tag{font-size:7.5pt;margin-bottom:1mm}

      @media print{
        @page{size:A4 portrait;margin:8mm}
        body{padding:0}
        .nao-imprimir{display:none!important}
      }
    `;
  }

  function gerarOMISHtml(d) {
    const cfg = getOsConfig();
    const numOmis = d.num_omis || d.num_os || '';
    const militares = extrairMilitares(d);
    const prim = militares[0] || {};
    const teveAlteracao = !!d.teve_alteracao_retorno;
    const ano = d.ano || (prim.data_inicio ? String(prim.data_inicio).slice(0, 4) : new Date().getFullYear());

    let modalidadeLabel = 'GRATIFICAÇÃO DE REPRESENTAÇÃO';
    if (d.modalidade === 'diaria') modalidadeLabel = 'DIÁRIA DE VIAGEM';
    else if (d.modalidade === 'sem_custo' || d.modalidade === 'omis' ||
             (d.enquadramento_legal && d.enquadramento_legal.includes('Sem Custo'))) modalidadeLabel = 'SEM CUSTO';

    const autoridadeNome = d.omis_autoridade || cfg.omis_autoridade_nome;
    const autoridadeCargo = d.omis_cargo || cfg.omis_autoridade_cargo;

    const up = t => String(t || '').toUpperCase();

    /* No formulário manual a identificação vem toda em caixa alta e centralizada. */
    const linhasMilitares = militares.map((m, idx) => `
        <tr>
          <td>${idx + 1}</td>
          <td colspan="4">${up(m.posto_grad)}${m.especialidade ? ' ' + up(m.especialidade) : ''} ${up(m.nome)}</td>
          <td>${up(m.nome_guerra || m.nome)}</td>
          <td>${m.cpf || ''}</td>
          <td>${m.saram || ''}</td>
        </tr>`).join('');

    /* Campos 4 e 5 são preenchidos no retorno da missão. Quando a OMIS é
       expedida ainda não há resposta — por isso o manual sai com as duas
       caixas vazias. Só marcamos quando a secretaria já registrou alteração. */
    const marcaSim = teveAlteracao ? 'X' : '&nbsp;&nbsp;';
    const marcaNao = teveAlteracao ? '&nbsp;&nbsp;' : '&nbsp;&nbsp;';
    const justAlteracao = teveAlteracao ? (d.justificativa_alteracao_retorno || '') : '';

    const linhasLivres = Array.from({ length: 5 }, (_, i) => `
        <tr><td class="linha-livre esq" colspan="8">${i === 0 && justAlteracao ? justAlteracao : '&nbsp;'}</td></tr>`).join('');

    const destino = d.local_destino || d.servico_local || '';
    const missao = d.servico_local || '';

    return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
    <title>OMIS ${limparNumOs(numOmis)} ${modalidadeLabel} ${prim.posto_grad} ${prim.nome_guerra || prim.nome}</title>
    <style>${estiloOmisOficial()}</style></head><body>

    <div class="folha">

      <div class="omis-topo">
        <img src="${logoDe}" alt="Divisão de Ensino" />
        <div class="omis-titulos">
          <div>Academia da Força Aérea</div>
          <div>Divisão de Ensino</div>
          <div>Ordem de Missão</div>
        </div>
        <img src="${logoAfa}" alt="AFA" />
      </div>

      <div class="omis-numero"><span>ORDEM DE MISSÃO Nº ${numOmis}</span></div>

      <table class="omis">
        <colgroup>
          <col style="width:5%"><col style="width:11%"><col style="width:11%">
          <col style="width:11%"><col style="width:16%"><col style="width:16%">
          <col style="width:15%"><col style="width:15%">
        </colgroup>

        <tr class="faixa"><th colspan="8">Militar(es)</th></tr>
        <tr>
          <th>#</th>
          <th colspan="4">Posto/Graduação/Especialidade/Nome Completo</th>
          <th>Nome de Guerra</th>
          <th>CPF</th>
          <th>SARAM</th>
        </tr>
        ${linhasMilitares}

        <tr class="vao"><td colspan="8"></td></tr>

        <tr class="faixa"><th colspan="8">Deslocamento</th></tr>
        <tr>
          <th colspan="4">Data / Horário de Ida</th>
          <th colspan="4">Local de Realização do Serviço</th>
        </tr>
        <tr>
          <td colspan="4">${prim.data_inicio_fmt} às ${prim.hora_inicio || '04:00'}</td>
          <td colspan="4">${destino}</td>
        </tr>
        <tr>
          <th colspan="4">Data / Horário de Retorno</th>
          <th colspan="4">Local do Retorno</th>
        </tr>
        <tr>
          <td colspan="4">${prim.data_fim_fmt} às ${prim.hora_fim || '16:00'}</td>
          <td colspan="4">Pirassununga - SP</td>
        </tr>

        <tr class="vao"><td colspan="8"></td></tr>

        <tr class="faixa"><th colspan="8">Deslocamento</th></tr>
        <tr><td class="item" colspan="8">1- Missão: <span>${missao}</span></td></tr>
        <tr><td class="item" colspan="8">2- Coordenador(a): <span>${up(prim.posto_grad)}${prim.especialidade ? ' ' + up(prim.especialidade) : ''} ${up(prim.nome_guerra || prim.nome)}</span></td></tr>
        <tr><td class="item" colspan="8">3- Modalidade de Pagamento: <span>${modalidadeLabel}</span></td></tr>
        <tr><td class="item" colspan="8">4- Ocorreram, por motivo de força maior, alterações no local de realização do serviço e/ou nas datas de início/retorno autorizados inicialmente? &nbsp;&nbsp; [ ${marcaSim} ] SIM &nbsp; [ ${marcaNao} ] NÃO</td></tr>
        <tr><td class="item" colspan="8">5- Em caso positivo justificar (utilizar o verso, se necessário)</td></tr>
        ${linhasLivres}

        <tr>
          <td class="rodape" colspan="4">
            Pirassununga/SP, <span class="risco">&nbsp;</span> de <span class="risco">&nbsp;</span> de ${ano}
          </td>
          <td class="assina" colspan="4">
            <div class="assina-linha"></div>
            <span class="assina-nome">${up(prim.nome)} ${up(prim.posto_grad)}${prim.especialidade ? ' ' + up(prim.especialidade) : ''}</span><br>
            <span class="assina-cargo">(Responsável pelo serviço)</span>
          </td>
        </tr>

        <tr>
          <td class="assina" colspan="8">
            <div class="assina-tag">Assinado Eletronicamente</div>
            <div class="assina-linha" style="width:52%"></div>
            <span class="assina-nome">${autoridadeNome}</span><br>
            <span class="assina-cargo">${autoridadeCargo}</span>
          </td>
        </tr>
      </table>
    </div>

    <script>window.onload=()=>window.print();<\/script>
    </body></html>`;
  }

  // ══════════════════════════════════════════════════════════════
  // 2. ORDEM DE SERVIÇO DE DESIGNAÇÃO ESPECÍFICA (OS)
  // Modelo: OS 25.DE.2026
  // ══════════════════════════════════════════════════════════════
  function gerarOSGratificacaoHtml(d) {
    const cfg = getOsConfig();
    const numOs = d.num_os || '25/DE/2026';
    const antecipado = !!d.pagamento_antecipado;
    const foraPrazo = !!d.fora_prazo;
    const art5 = d.enquadramento_legal || 'Art 5°, Inc II (Viagem de Instrução)';
    const militares = extrairMilitares(d);

    const autoridadeNome = d.comandante_nome || cfg.grat_os_autoridade_nome;
    const autoridadeCargo = d.comandante_cargo || cfg.grat_os_autoridade_cargo;

    const linhasTabela = militares.map((m, idx) => `
      <tr>
        <td style="width:20px;text-align:center">${idx + 1}</td>
        <td>${m.posto_grad} ${m.especialidade}</td>
        <td class="left"><strong>${m.nome}</strong> / ${m.cpf || '—'}</td>
        <td>${m.saram || '—'}</td>
        <td>${m.om || 'AFA'}</td>
        <td>${m.data_inicio_fmt}<br>${m.hora_inicio || '04:00'}<br>a ${m.data_fim_fmt}<br>${m.hora_fim || '16:00'}</td>
        <td><strong>${m.dias || 1}</strong></td>
        <td>${m.passagem || 'NÃO'}</td>
      </tr>
    `).join('');

    const justPrazoTxt = foraPrazo 
      ? (d.justificativa_prazo || 'Devido à natureza da missão a solicitação foi feita fora do prazo.')
      : 'Não se aplica.';

    return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
    <title>OS ${limparNumOs(numOs)}</title>
    <style>${estiloOficialOS()}</style></head><body>
    
    <div style="text-align:center;margin-bottom:3mm;line-height:1.2">
      <div style="font-weight:700;font-size:9.5pt">COMANDO DA AERONÁUTICA</div>
      <div style="font-weight:700;font-size:9pt">ACADEMIA DA FORÇA AÉREA</div>
      <div style="font-weight:700;font-size:10pt;margin-top:2mm;border-bottom:1.2pt solid #000;display:inline-block;padding-bottom:1mm">
        ORDEM DE SERVIÇO DE DESIGNAÇÃO ESPECÍFICA Nº ${numOs}
      </div>
    </div>

    <div style="text-align:center;font-weight:700;font-size:8.5pt;margin-bottom:3mm;letter-spacing:.04em">
      GRATIFICAÇÃO DE REPRESENTAÇÃO SOMENTE MILITARES DA ATIVA
    </div>

    <div class="sec-header">I - AUTORIZAÇÃO PARA REALIZAÇÃO DA MISSÃO:</div>
    <div style="font-weight:600;font-size:8pt;margin-bottom:1.5mm">
      I.1 - DETERMINAÇÃO: Determino ao militar(es) abaixo que realize(m) o serviço especificado:
    </div>

    <table class="table-doc">
      <thead>
        <tr>
          <th style="width:20px">Ordem</th>
          <th>Posto Grad / Esp</th>
          <th>NOME COMPLETO / CPF</th>
          <th>SARAM</th>
          <th>OM</th>
          <th>PERÍODO (DATA / HORA)</th>
          <th>DIAS</th>
          <th>PASSAGEM AÉREA / RODOVIÁRIA / SIM E NÃO</th>
        </tr>
      </thead>
      <tbody>
        ${linhasTabela}
      </tbody>
    </table>

    <div class="box-field">
      <strong>SERVIÇO A REALIZAR/ LOCAL:</strong> ${d.servico_local || 'Participar de evento/missão institucional.'}
    </div>

    <div class="box-field">
      <strong>APOIO RECEBIDO:</strong> ${d.apoio_recebido || 'O apoio de transporte será fornecido pela AFA e a hospedagem e o rancho serão fornecidos pela OM de destino.'}
    </div>

    <div class="box-field">
      <strong>ENQUADRAMENTO LEGAL:</strong> baseado no Decreto nº 11.002, de 17 de março de 2022<br>
      <div style="margin-top:1.5mm;font-weight:600">
        MISSÕES DE NATUREZA ADMINISTRATIVA / INSTRUÇÃO:<br>
        [ X ] <strong>${art5}</strong>
      </div>
    </div>

    <div class="sec-header">I.2 MISSÕES REALIZADAS COM CRÉDITO DE PASSAGENS DE OUTRA ORGANIZAÇÃO</div>
    <div class="box-field">${d.passagens_outra_om || 'Não se aplica.'}</div>

    <div class="sec-header">I.3 PAGAMENTO ANTECIPADO DA GRATIFICAÇÃO DE REPRESENTAÇÃO</div>
    <div class="box-field">
      NECESSIDADE DE PAGAMENTO ANTECIPADO : [ ${antecipado ? 'X' : '&nbsp;'} ] SIM &nbsp;&nbsp;&nbsp; [ ${!antecipado ? 'X' : '&nbsp;'} ] NÃO<br>
      <strong>JUSTIFICATIVA:</strong> ${antecipado ? (d.justificativa_antecipacao || 'Necessidade de custeio inicial.') : 'Não se Aplica'}
    </div>

    <div class="sec-header">I.4 JUSTIFICATIVA PARA O NÃO CUMPRIMENTO DO PRAZO PREVISTO NO §1º DO ART. 10º DA PORTARIA GABAER / GC4 Nº1636, DE 20 DE MAIO DE 2026.</div>
    <div class="box-field">
      <strong>JUSTIFICATIVA:</strong> ${justPrazoTxt}
    </div>

    <div style="margin-top:6mm;text-align:right;font-size:8pt">
      Pirassununga - SP, ${dataPorExtenso(d.data_os || (militares[0] && militares[0].data_inicio))}
    </div>

    <div class="single-signature" style="text-align:right;margin-top:8mm">
      <div class="ass-digital-tag" style="text-align:right;margin-right:12mm">Assinado Digitalmente</div>
      <div class="name" style="display:inline-block;text-align:center">
        ${autoridadeNome}<br>
        <small style="font-weight:400">${autoridadeCargo}</small>
      </div>
    </div>

    <script>window.onload=()=>window.print();<\/script>
    </body></html>`;
  }

  // ══════════════════════════════════════════════════════════════
  // 3. AUTORIZAÇÃO PARA PAGAMENTO DE GRATIFICAÇÃO DE REPRESENTAÇÃO
  // Modelos: AUTORIZAÇÃO 24.DE.2026 / 25.DE.2026
  // ══════════════════════════════════════════════════════════════
  function gerarAutorizacaoGratificacaoHtml(d) {
    const cfg = getOsConfig();
    const numOs = d.num_os || '24/DE/2026';
    const antecipado = !!d.pagamento_antecipado;
    const pct = d.percentual || '2%';
    const ano = d.ano || new Date().getFullYear();

    const autoridadeNome = d.chefe_nome || cfg.grat_aut_autoridade_nome;
    const autoridadeCargo = d.chefe_cargo || cfg.grat_aut_autoridade_cargo;
    const cidade = cfg.grat_aut_cidade || 'Brasilia-DF';

    return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
    <title>AUTORIZAÇÃO ${limparNumOs(numOs)}</title>
    <style>${estiloOficialOS()}</style></head><body>
    
    <div style="text-align:center;margin-bottom:6mm;line-height:1.3">
      <div style="font-weight:700;font-size:9.5pt">COMANDO DA AERONÁUTICA</div>
      <div style="font-weight:700;font-size:9pt">ACADEMIA DA FORÇA AÉREA</div>
      <div style="font-weight:700;font-size:10pt;margin-top:3mm;border-bottom:1.2pt solid #000;display:inline-block;padding-bottom:1mm">
        AUTORIZAÇÃO PARA PAGAMENTO DE GRATIFICAÇÃO DE REPRESENTAÇÃO Nº ${numOs}
      </div>
    </div>

    <div class="box-field" style="padding:4mm 5mm;line-height:1.6;font-size:8.5pt;margin-bottom:6mm">
      <p style="text-align:justify">
        Autorizo o pagamento da gratificação de representação de <strong>${pct} (dois por cento)</strong> do soldo, pelo número de dias declarado ao lado de cada militar relacionado no item I.1 da Ordem de Serviço de designação específica nº <strong>${numOs}</strong>.
      </p>

      <div style="margin-top:6mm;line-height:1.6">
        <div style="margin-bottom:4mm">
          ( ${antecipado ? 'X' : '&nbsp;&nbsp;'} ) Autorizando também o pagamento antecipado, conforme justificativa constante do item I.3 da ordem de serviço de designação específica nº ${numOs}.
        </div>
        <div>
          ( ${!antecipado ? 'X' : '&nbsp;&nbsp;'} ) Não autorizando o pagamento antecipado, ficando ele condicionado e vinculado às informações constantes na ficha de apresentação por retorno de missão referente à Ordem de Serviço de designação específica nº ${numOs}.
        </div>
      </div>
    </div>

    <div style="margin-top:8mm;font-size:8.5pt">
      ${cidade}, ____ de _____________ de ${ano}
    </div>

    <div class="single-signature" style="margin-top:18mm">
      <div class="name">
        ${autoridadeNome}<br>
        <small style="font-weight:400">${autoridadeCargo}</small>
      </div>
    </div>

    <script>window.onload=()=>window.print();<\/script>
    </body></html>`;
  }

  // ══════════════════════════════════════════════════════════════
  // 4. FICHA DE APRESENTAÇÃO POR RETORNO DE MISSÃO
  // Modelos: FICHA DE APRESENTAÇÃO 24.DE.2026 / 25.DE.2026
  // ══════════════════════════════════════════════════════════════
  function gerarFichaApresentacaoGratificacaoHtml(d) {
    const numOs = d.num_os || '24/DE/2026';
    const teveAlteracao = !!d.teve_alteracao_retorno;
    const militares = extrairMilitares(d);
    const prim = militares[0] || {};

    let linhasRetorno = '';
    if (!teveAlteracao) {
      linhasRetorno = `
        <tr>
          <td style="width:20px;text-align:center">&nbsp;</td>
          <td>&nbsp;</td>
          <td>&nbsp;</td>
          <td>&nbsp;</td>
          <td>&nbsp;</td>
          <td>&nbsp;</td>
          <td>&nbsp;</td>
          <td>&nbsp;</td>
        </tr>`;
    } else {
      const listaAlts = (Array.isArray(d.retorno_dados_alteracao) && d.retorno_dados_alteracao.length)
        ? d.retorno_dados_alteracao
        : militares;

      linhasRetorno = listaAlts.map((m, idx) => `
        <tr>
          <td style="width:20px;text-align:center">${idx + 1}</td>
          <td>${m.posto_grad || ''} ${m.especialidade || ''}</td>
          <td class="left"><strong>${m.nome || ''}</strong> / ${m.cpf || '—'}</td>
          <td>${m.saram || '—'}</td>
          <td>${m.om || 'AFA'}</td>
          <td>${m.retorno_inicio_fmt || m.data_inicio_fmt || ''}<br>${m.retorno_hora_inicio || m.hora_inicio || '04:00'}<br>a ${m.retorno_fim_fmt || m.data_fim_fmt || ''}<br>${m.retorno_hora_fim || m.hora_fim || '16:00'}</td>
          <td><strong>${m.dias_retorno || m.dias || 1}</strong></td>
          <td>${m.passagem || 'NÃO'}</td>
        </tr>
      `).join('');
    }

    const justRetornoTxt = teveAlteracao
      ? (d.justificativa_alteracao_retorno || 'Por motivos de trânsito/serviço, o militar retornou no horário informado na tabela.')
      : 'Não se aplica.';

    return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
    <title>FICHA DE APRESENTAÇÃO ${limparNumOs(numOs)}</title>
    <style>${estiloOficialOS()}</style></head><body>
    
    <div style="text-align:center;margin-bottom:4mm;line-height:1.2">
      <div style="font-weight:700;font-size:9.5pt">COMANDO DA AERONÁUTICA</div>
      <div style="font-weight:700;font-size:9pt">ACADEMIA DA FORÇA AÉREA</div>
      <div style="font-weight:600;font-size:8.8pt;margin-top:2.5mm">
        Ficha de Apresentação por Retorno de Missão referente à Ordem de Serviço de designação específica nº <strong>${numOs}</strong>
      </div>
    </div>

    <div class="sec-header">RELATO DO RESPONSÁVEL PELO SERVIÇO:</div>
    <div class="box-field" style="line-height:1.5">
      <p style="margin-bottom:2mm">
        Ocorreram, por motivo de força maior, alterações no local de realização do serviço e/ou nas datas de início/retorno autorizados inicialmente?
      </p>
      <div style="margin-bottom:2mm;font-weight:600">
        ( ${teveAlteracao ? 'X' : '&nbsp;&nbsp;'} ) SIM, CONFORME TABELA ABAIXO &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ( ${!teveAlteracao ? 'X' : '&nbsp;&nbsp;'} ) NÃO
      </div>
      <div>
        <strong>JUSTIFICATIVA:</strong> ${justRetornoTxt}
      </div>
    </div>

    <table class="table-doc">
      <thead>
        <tr>
          <th style="width:20px">Ordem</th>
          <th>Posto Grad/Esp</th>
          <th>Nome Completo / CPF</th>
          <th>Saram</th>
          <th>OM</th>
          <th>Período (data/hora)</th>
          <th>DIAS</th>
          <th>Passagem Aérea/Rodoviárias</th>
        </tr>
      </thead>
      <tbody>
        ${linhasRetorno}
      </tbody>
    </table>

    <div style="margin-top:6mm;font-size:8pt">
      Pirassununga-SP, ${dataPorExtenso(d.data_retorno || (militares[0] && militares[0].data_fim))}.
    </div>

    <div style="margin-top:8mm;text-align:right;font-size:8pt">
      <div>Responsável pelo serviço:</div>
      <div class="ass-digital-tag" style="margin-top:8mm">assinado digitalmente</div>
      <div style="font-weight:700;text-transform:uppercase">${prim.nome} ${prim.posto_grad}</div>
    </div>

    <script>window.onload=()=>window.print();<\/script>
    </body></html>`;
  }

  // ══════════════════════════════════════════════════════════════
  // MÓDULO AUXÍLIO TRANSPORTE (EXISTENTE)
  // ══════════════════════════════════════════════════════════════
  function gerarDiasDeduzidos(comp, dadosMilitares) {
    const [ano, mes] = comp.split('-').map(Number);
    const mesNome = MESES[mes - 1];
    const mesAbrev = mesAbreviado(comp);

    const linhas = dadosMilitares.map(({ m, r }) => {
      const descVal = r.zerado ? r.vig : r.desconto;
      const diasStr = r.zerado ? '—' : r.diasDescNum;
      return `<tr>
        <td style="text-align:center">${m.grad}</td>
        <td style="text-align:center">${m.esp || '—'}</td>
        <td>${m.nome}</td>
        <td style="text-align:center">${m.saram}</td>
        <td style="text-align:center;font-weight:700">${diasStr}</td>
        <td style="text-align:right;font-weight:700">R$ ${descVal.toFixed(2).replace('.', ',')}</td>
      </tr>`;
    }).join('');

    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
    <title>DIAS_A_SEREM_DEDUZIDOS_TODOS_${mesAbrev}_${ano}</title>
    <style>${estiloBase}</style></head><body>
    <div class="cab-doc">
      <div class="logo-area"><img src="${logoAfa}" alt="AFA" /></div>
      <div class="titulo-area">
        <h1>Planilha de Controle Auxílio-Transporte – AFA/DE</h1>
        <p>MINISTÉRIO DA DEFESA · COMANDO DA AERONÁUTICA · DIVISÃO ADMINISTRATIVA · SUBDIVISÃO DE PESSOAL</p>
      </div>
      <div class="mes-area">${mesNome}<br>${ano}</div>
    </div>
    <table>
      <thead><tr>
        <th style="text-align:center">P/G</th>
        <th style="text-align:center">ESP</th>
        <th>NOME COMPLETO</th>
        <th style="text-align:center">GUERRA / SARAM</th>
        <th style="text-align:center">DIAS DESCONTADOS</th>
        <th style="text-align:right">VALOR DO DESCONTO</th>
      </tr></thead>
      <tbody>${linhas}</tbody>
    </table>
    <div class="rodape">Governança DE · Documento oficial de comprovação de frequência do Auxílio-Transporte</div>
    <script>window.onload=()=>window.print();<\/script>
    </body></html>`;

    baixarHtml(html, `DIAS_A_SEREM_DEDUZIDOS_TODOS_${mesAbrev}_${ano}.html`);
  }

  function gerarDescontoAuxilio(comp, dadosMilitares) {
    const [ano, mes] = comp.split('-').map(Number);
    const mesNome = MESES[mes - 1];

    const linhas = dadosMilitares.map(({ m, r }) => {
      const descVal = r.zerado ? r.vig : r.desconto;
      return `<tr>
        <td style="text-align:center">${m.saram}</td>
        <td style="text-align:center">${m.grad}</td>
        <td>${m.nome}</td>
        <td>Ofício nº /DE<br><small style="color:#555">(SIGAD 550297)</small></td>
        <td style="text-align:right;font-weight:700">R$ ${descVal.toFixed(2).replace('.', ',')}</td>
      </tr>`;
    }).join('');

    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
    <title>Auxílio Transporte DE - Desconto (conferenciaaci) ${mesNome}</title>
    <style>${estiloBase}</style></head><body>
    <div class="cab-doc">
      <div class="logo-area"><img src="${logoAfa}" alt="AFA" /></div>
      <div class="titulo-area">
        <h1>DESCONTO AUXÍLIO TRANSPORTE REFERENTE A ${mesNome}/${ano}</h1>
        <p>MINISTÉRIO DA DEFESA · COMANDO DA AERONÁUTICA · DIVISÃO ADMINISTRATIVA · SUBDIVISÃO DE PESSOAL</p>
      </div>
      <div class="mes-area">${mesNome}<br>${ano}</div>
    </div>
    <table>
      <thead><tr>
        <th style="text-align:center">SARAM</th>
        <th style="text-align:center">P/G</th>
        <th>NOME DE GUERRA</th>
        <th>OFÍCIO</th>
        <th style="text-align:right">VALOR</th>
      </tr></thead>
      <tbody>${linhas}</tbody>
    </table>
    <div class="rodape">Governança DE · Extrato para conferência e instrução do processo administrativo</div>
    <script>window.onload=()=>window.print();<\/script>
    </body></html>`;

    baixarHtml(html, `Auxílio Transporte DE - Desconto (conferenciaaci) ${mesNome}.html`);
  }

  // ══════════════════════════════════════════════════════════════
  // MÉTODOS PÚBLICOS DO MOTOR
  // ══════════════════════════════════════════════════════════════
  return {
    gerarDiasDeduzidos,
    gerarDescontoAuxilio,

    // Geração de Documentos de OS
    gerarOMIS: function(d, baixar = true) {
      const html = gerarOMISHtml(d);
      const prim = (Array.isArray(d.militares) && d.militares[0]) ? d.militares[0] : d;
      let mod = 'GRATIREP';
      if (d.modalidade === 'diaria') mod = 'DIARIA';
      else if (d.modalidade === 'sem_custo' || d.modalidade === 'omis') mod = 'SEM CUSTO';

      const postoBase = (prim.posto_grad || '').split(' ')[0] || '';
      let guerra = (prim.nome_guerra || (prim.nome ? prim.nome.split(' ')[0] : 'COORDENADOR')).trim();
      if (postoBase && guerra.toUpperCase().startsWith(postoBase.toUpperCase() + ' ')) {
        guerra = guerra.substring(postoBase.length).trim();
      }
      const numOmis = d.num_omis || d.num_os || 'OMIS';
      const fileName = `OMIS ${limparNumOs(numOmis)} ${mod} ${postoBase} ${guerra}.html`.replace(/\s+/g, ' ');
      if (baixar) baixarHtml(html, fileName);
      return { html, fileName };
    },

    gerarOSGratificacao: function(d, baixar = true) {
      const html = gerarOSGratificacaoHtml(d);
      const fileName = `OS ${limparNumOs(d.num_os)}.html`;
      if (baixar) baixarHtml(html, fileName);
      return { html, fileName };
    },

    gerarAutorizacaoGratificacao: function(d, baixar = true) {
      const html = gerarAutorizacaoGratificacaoHtml(d);
      const fileName = `AUTORIZAÇÃO ${limparNumOs(d.num_os)}.html`;
      if (baixar) baixarHtml(html, fileName);
      return { html, fileName };
    },

    gerarFichaApresentacaoGratificacao: function(d, baixar = true) {
      const html = gerarFichaApresentacaoGratificacaoHtml(d);
      const fileName = `FICHA DE APRESENTAÇÃO ${limparNumOs(d.num_os)}.html`;
      if (baixar) baixarHtml(html, fileName);
      return { html, fileName };
    },

    // Compila os 2 documentos iniciais do processo SIGADAER (OS + Autorização)
    compilarPacoteInicial: function(d) {
      this.gerarOSGratificacao(d, true);
      setTimeout(() => this.gerarAutorizacaoGratificacao(d, true), 350);
    },

    // Compila os 3 ou 4 documentos de Gratificação / OS de uma vez
    compilarPacoteGratificacao: function(d, incluirOmis = true) {
      this.gerarOSGratificacao(d, true);
      setTimeout(() => this.gerarAutorizacaoGratificacao(d, true), 350);
      setTimeout(() => this.gerarFichaApresentacaoGratificacao(d, true), 700);
      if (incluirOmis) {
        setTimeout(() => this.gerarOMIS(d, true), 1050);
      }
    }
  };
})();
