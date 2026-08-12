/* ══════════════════════════════════════════════════════════════
   MOTOR UNIFICADO DE COMPILAÇÃO DE DOCUMENTOS DO AUXÍLIO TRANSPORTE
   compiladordoc.js — Governança DE (AFA/DE)
   ══════════════════════════════════════════════════════════════ */

const CompiladorDoc = (function() {
  const MESES = ['JANEIRO','FEVEREIRO','MARÇO','ABRIL','MAIO','JUNHO','JULHO','AGOSTO','SETEMBRO','OUTUBRO','NOVEMBRO','DEZEMBRO'];
  const SEMANA = ['DOM.','SEG.','TER.','QUA.','QUI.','SEX.','SÁB.'];

  function rotuloComp(comp) {
    const [a, m] = comp.split('-').map(Number);
    return MESES[m - 1] + '/' + a;
  }

  function mesAbreviado(comp) {
    const [a, m] = comp.split('-').map(Number);
    return MESES[m - 1].substring(0, 3); // ex: JUN
  }

  function fmtBRL(v) {
    return (v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  const logoAfa = 'assets/brasao-afa.jpg';

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

  // Auxiliar para disparar o download de HTML
  function baixarHtml(html, nomeArquivo) {
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nomeArquivo;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 3000);
  }

  // ── DOCUMENTO 1: DIAS_A_SEREM_DEDUZIDOS_TODOS ──
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

  // ── DOCUMENTO 2: DESCONTO AUXÍLIO TRANSPORTE ──
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

  // ── DOCUMENTO 3: TABELAS DE FREQUÊNCIA INDIVIDUAL COMPILADAS ──
  // Junta todas as tabelas de frequência individuais em um único documento compilado ou PDF unido
  async function gerarTabelasCompiladas(comp, dadosMilitares, urlPdfFn) {
    const [ano, mes] = comp.split('-').map(Number);
    const mesNome = MESES[mes - 1];
    const mesAbrev = mesAbreviado(comp);

    // Carrega pdf-lib dinamicamente se disponível para tentar unir PDFs reais assinados
    let pdfLib = window.PDFLib;
    if (!pdfLib) {
      try {
        await new Promise((res, rej) => {
          const s = document.createElement('script');
          s.src = 'https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.min.js';
          s.onload = () => res(window.PDFLib);
          s.onerror = rej;
          document.head.appendChild(s);
        });
        pdfLib = window.PDFLib;
      } catch (e) {
        console.warn('PDFLib não disponível online. Fallback para compilação HTML.', e);
      }
    }

    // Se pdfLib disponível e temos declarações com pdf_assinado
    if (pdfLib) {
      try {
        const { PDFDocument } = pdfLib;
        const pdfUnido = await PDFDocument.create();
        let PDFsAdicionados = 0;

        for (const { d } of dadosMilitares) {
          if (d && d.pdf_assinado) {
            try {
              const url = urlPdfFn(d.pdf_assinado);
              const resp = await fetch(url);
              if (resp.ok) {
                const bytes = await resp.arrayBuffer();
                const pdf = await PDFDocument.load(bytes);
                const paginasCopiadas = await pdfUnido.copyPages(pdf, pdf.getPageIndices());
                paginasCopiadas.forEach(p => pdfUnido.addPage(p));
                PDFsAdicionados++;
              }
            } catch (err) {
              console.warn('Erro ao carregar PDF do militar:', err);
            }
          }
        }

        if (PDFsAdicionados > 0) {
          const pdfBytes = await pdfUnido.save();
          const blob = new Blob([pdfBytes], { type: 'application/pdf' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `TABELAS_DE_FREQUENCIA_INDIVIDUAL_${mesAbrev}_${ano}.pdf`;
          a.click();
          setTimeout(() => URL.revokeObjectURL(url), 3000);
          return;
        }
      } catch (e) {
        console.warn('Falha na compilação via pdf-lib:', e);
      }
    }

    // Fallback: Compilação HTML com quebra de página por militar
    const paginasHtml = dadosMilitares.map(({ m, d, r }, idx) => {
      const diasGrade = [];
      const totDias = new Date(ano, mes, 0).getDate();
      for (let day = 1; day <= totDias; day++) {
        const dow = new Date(ano, mes - 1, day).getDay();
        const reg = (d && d.dias && d.dias[day]) || {};
        const mot = reg.motivo || '';
        const util = dow >= 1 && dow <= 5;
        let mS = '', mN = '', tS = '', tN = '', motRotulo = '', obs = reg.obs || '';

        const rotulos = {
          'UTILIZADO': 'Utilizado',
          'ENTRANDO_SERVICO': 'Entrando de Serviço',
          'SAINDO_SERVICO': 'Saindo de Serviço',
          'FERIADO': 'Feriado',
          'SEM_EXPEDIENTE': 'Sem Expediente',
          'DISPENSA': 'Dispensa',
          'ATESTADO': 'Atestado / Saúde',
          'MISSAO': 'Missão fora da sede',
          'FERIAS_P1': 'Férias — 1ª parcela (10 dias)',
          'FERIAS_P2': 'Férias — 2ª parcela (10 dias)',
          'FERIAS_P3': 'Férias — 3ª parcela (10 dias)',
          'FERIAS_P1_15': 'Férias — 1º 15 (15 dias)',
          'FERIAS_P2_15': 'Férias — 2º 15 (15 dias)',
          'FERIAS_COMPLETA': 'Férias completas — 30 dias (início)',
          'FERIAS_CONT': 'Férias — continuação do mês anterior',
          'DESCONTO_FERIAS': 'Desconto em Férias',
          'FERIAS_RESTANTES': 'Férias Restantes'
        };

        if (!util) {
          mS = mN = tS = tN = motRotulo = '–';
        } else if (mot === 'UTILIZADO') {
          mS = 'X'; tS = 'X'; motRotulo = 'Utilizado';
        } else if (mot === 'ENTRANDO_SERVICO') {
          mS = 'X'; tN = 'X'; motRotulo = 'Entrando de Serviço';
        } else if (mot === 'SAINDO_SERVICO') {
          mN = 'X'; tS = 'X'; motRotulo = 'Saindo de Serviço';
        } else if (mot) {
          mN = 'X'; tN = 'X'; motRotulo = rotulos[mot] || mot;
        }

        diasGrade.push(`<tr ${!util ? 'style="background:#eee;color:#777"' : ''}>
          <td style="text-align:center">${String(day).padStart(2, '0')}</td>
          <td style="text-align:center">${SEMANA[dow]}</td>
          <td style="text-align:center">${mS}</td>
          <td style="text-align:center">${mN}</td>
          <td style="text-align:center">${tS}</td>
          <td style="text-align:center">${tN}</td>
          <td>${motRotulo}</td>
          <td>${obs}</td>
        </tr>`);
      }

      const ehUltimo = idx === dadosMilitares.length - 1;

      return `<div class="${!ehUltimo ? 'quebra-pagina' : ''}">
        <div style="border:1pt solid #0a1730;padding:2mm 4mm;margin-bottom:3mm;display:flex;align-items:center;gap:3mm">
          <img src="${logoAfa}" alt="AFA" style="width:13mm;height:13mm;object-fit:contain" />
          <div style="flex:1">
            <h2 style="font-size:9pt;text-transform:uppercase">TABELA DE FREQUÊNCIA - AUX. TRANSPORTE – ${mesNome}/${ano}</h2>
            <p style="font-size:8pt">GRAD. / NOME DO MILITAR: <b>${m.grad} ${m.nome}</b> | SARAM: <b>${m.saram}</b></p>
          </div>
          <div style="text-align:right;font-size:7.5pt">
            <div>AUXÍLIO EM VIGÊNCIA: <b>${fmtBRL(r.vig)}</b></div>
            <div>VALOR DIÁRIO: <b>${fmtBRL(r.vDia)}</b></div>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th rowspan="2" style="text-align:center;width:8mm">Dia</th>
              <th rowspan="2" style="text-align:center;width:10mm">Sem</th>
              <th colspan="2" style="text-align:center">MANHÃ</th>
              <th colspan="2" style="text-align:center">TARDE</th>
              <th rowspan="2">Motivo</th>
              <th rowspan="2">Observações</th>
            </tr>
            <tr>
              <th style="text-align:center;width:8mm">SIM</th>
              <th style="text-align:center;width:8mm">NÃO</th>
              <th style="text-align:center;width:8mm">SIM</th>
              <th style="text-align:center;width:8mm">NÃO</th>
            </tr>
          </thead>
          <tbody>${diasGrade.join('')}</tbody>
        </table>
        <div style="margin-top:3mm;font-size:7pt;display:flex;justify-content:space-between">
          <div>DIAS DESCONTADOS: <b>${r.diasDescNum}</b> | VALOR DESCONTO: <b>${fmtBRL(r.desconto)}</b></div>
          <div>ASSINATURA GOV.BR: <b>${d && d.pdf_assinado ? 'Documento Assinado Digitalmente' : 'Pendente'}</b></div>
        </div>
      </div>`;
    }).join('');

    const htmlCompleto = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
    <title>TABELAS_DE_FREQUENCIA_INDIVIDUAL_${mesAbrev}_${ano}</title>
    <style>${estiloBase}</style></head><body>
    ${paginasHtml}
    <script>window.onload=()=>window.print();</script>
    </body></html>`;

    baixarHtml(htmlCompleto, `TABELAS_DE_FREQUENCIA_INDIVIDUAL_${mesAbrev}_${ano}.html`);
  }

  // ══════════════════════════════════════════════════════════════
  // MÓDULO DE GRATIFICAÇÃO DE REPRESENTAÇÃO (MISSÕES)
  // Modelos extraídos do Processo 23/DE/2026
  // ══════════════════════════════════════════════════════════════

  function estiloGratificacao() {
    return `
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
      *{box-sizing:border-box;margin:0;padding:0}
      body{font-family:'Inter',Arial,sans-serif;color:#000;background:#fff;padding:12mm 15mm;font-size:9pt;line-height:1.35}
      .head-fab{text-align:center;font-weight:700;font-size:10pt;text-transform:uppercase;margin-bottom:4mm;line-height:1.2}
      .head-fab small{display:block;font-size:9pt;font-weight:600}
      .head-fab .doc-title{margin-top:2mm;font-size:10.5pt;color:#0a1730;border-bottom:1.5pt solid #0a1730;padding-bottom:1.5mm;display:inline-block}
      .sub-title{text-align:center;font-weight:700;font-size:9.5pt;margin-bottom:4mm;text-transform:uppercase;color:#333}
      .sec-title{font-weight:700;font-size:9pt;text-transform:uppercase;margin:3mm 0 1.5mm 0}
      table.grid-doc{width:100%;border-collapse:collapse;margin:2mm 0 4mm 0;font-size:8.5pt}
      table.grid-doc th, table.grid-doc td{border:1pt solid #000;padding:2mm;text-align:center;vertical-align:middle}
      table.grid-doc th{background:#eef2f7;font-weight:700;text-transform:uppercase;font-size:7.5pt}
      .box-info{border:1pt solid #000;padding:2.5mm;margin-bottom:3mm;font-size:8.5pt;background:#fafafa}
      .box-info strong{display:inline-block;margin-bottom:1mm;font-size:8.5pt}
      .check-item{display:flex;align-items:center;gap:3mm;margin:1.5mm 0}
      .check-box{display:inline-block;width:12px;height:12px;border:1pt solid #000;text-align:center;line-height:10px;font-size:8pt;font-weight:700}
      .ass-block{margin-top:10mm;text-align:right;font-size:9pt}
      .ass-block .ass-digital{margin-top:6mm;text-align:center;font-size:8.5pt;font-style:italic;color:#444}
      .ass-block .ass-nome{font-weight:700;text-transform:uppercase;margin-top:1mm}
      @media print{
        @page{size:A4 portrait;margin:10mm}
        body{padding:0}
        .nao-imprimir{display:none!important}
      }
    `;
  }

  function fmtDataIso(iso) {
    if (!iso) return '—';
    const [a, m, d] = iso.split('-');
    return `${d}/${m}/${a}`;
  }

  function extrairMilitares(d) {
    if (Array.isArray(d.militares) && d.militares.length > 0) {
      return d.militares.map(m => ({
        posto_grad: m.posto_grad || '',
        especialidade: m.especialidade || '',
        nome: m.nome || '',
        cpf: m.cpf || '',
        saram: m.saram || '',
        om: m.om || 'AFA',
        data_inicio_fmt: m.data_inicio_fmt || fmtDataIso(m.data_inicio || d.data_inicio),
        hora_inicio: m.hora_inicio || d.hora_inicio || '08:00',
        data_fim_fmt: m.data_fim_fmt || fmtDataIso(m.data_fim || d.data_fim),
        hora_fim: m.hora_fim || d.hora_fim || '18:00',
        dias: m.dias || d.dias || 1,
        passagem: m.passagem || d.passagem || 'NÃO',
        retorno_inicio_fmt: m.retorno_inicio_fmt || m.data_inicio_fmt || fmtDataIso(m.data_inicio || d.data_inicio),
        retorno_hora_inicio: m.retorno_hora_inicio || m.hora_inicio || d.hora_inicio || '08:00',
        retorno_fim_fmt: m.retorno_fim_fmt || m.data_fim_fmt || fmtDataIso(m.data_fim || d.data_fim),
        retorno_hora_fim: m.retorno_hora_fim || m.hora_fim || d.hora_fim || '18:00',
        dias_retorno: m.dias_retorno || m.dias || d.dias || 1
      }));
    }
    return [{
      posto_grad: d.posto_grad || '',
      especialidade: d.especialidade || '',
      nome: d.nome || '',
      cpf: d.cpf || '',
      saram: d.saram || '',
      om: d.om || 'AFA',
      data_inicio_fmt: d.data_inicio_fmt || fmtDataIso(d.data_inicio),
      hora_inicio: d.hora_inicio || '08:00',
      data_fim_fmt: d.data_fim_fmt || fmtDataIso(d.data_fim),
      hora_fim: d.hora_fim || '18:00',
      dias: d.dias || 1,
      passagem: d.passagem || 'NÃO',
      retorno_inicio_fmt: d.retorno_inicio_fmt || d.data_inicio_fmt || fmtDataIso(d.data_inicio),
      retorno_hora_inicio: d.retorno_hora_inicio || d.hora_inicio || '08:00',
      retorno_fim_fmt: d.retorno_fim_fmt || d.data_fim_fmt || fmtDataIso(d.data_fim),
      retorno_hora_fim: d.retorno_hora_fim || d.hora_fim || '18:00',
      dias_retorno: d.dias_retorno || d.dias || 1
    }];
  }

  // 1. OS de Designação Específica
  function gerarOSGratificacaoHtml(d) {
    const ano = d.ano || new Date().getFullYear();
    const numOs = d.num_os || '24/DE/' + ano;
    const antecipado = !!d.pagamento_antecipado;
    const foraPrazo = !!d.fora_prazo;
    const art5 = d.enquadramento_legal || 'Art 5°, Inc II (Viagem de Instrução)';
    const militares = extrairMilitares(d);

    const linhasTabela = militares.map((m, idx) => `
      <tr>
        <td>${idx + 1}</td>
        <td>${m.posto_grad || ''} ${m.especialidade || ''}</td>
        <td><strong>${m.nome || ''}</strong> / ${m.cpf || '—'}</td>
        <td>${m.saram || '—'}</td>
        <td>${m.om || 'AFA'}</td>
        <td>${m.data_inicio_fmt || ''}<br>${m.hora_inicio || '08:00'} a ${m.data_fim_fmt || ''}<br>${m.hora_fim || '18:00'}</td>
        <td><strong>${m.dias || 1}</strong></td>
        <td>${m.passagem || 'NÃO'}</td>
      </tr>
    `).join('');

    const justPrazoTxt = foraPrazo 
      ? (d.justificativa_prazo || 'Devido à natureza da missão a solicitação foi feita fora do prazo')
      : 'Não se aplica.';

    return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
    <title>OS_${numOs.replace(/\//g, '_')}</title>
    <style>${estiloGratificacao()}</style></head><body>
    <div class="head-fab">
      COMANDO DA AERONÁUTICA<br>
      ACADEMIA DA FORÇA AÉREA
      <div class="doc-title">ORDEM DE SERVIÇO DE DESIGNAÇÃO ESPECÍFICA Nº ${numOs}</div>
    </div>
    <div class="sub-title">GRATIFICAÇÃO DE REPRESENTAÇÃO SOMENTE MILITARES DA ATIVA</div>

    <div class="sec-title">I - AUTORIZAÇÃO PARA REALIZAÇÃO DA MISSÃO:</div>
    <div style="font-weight:700;margin-bottom:1.5mm">I.1 - DETERMINAÇÃO:</div>
    <p style="margin-bottom:2mm">Determino ao militar(es) abaixo que realize(m) o serviço especificado:</p>

    <table class="grid-doc">
      <thead>
        <tr>
          <th>Ordem</th>
          <th>Posto/Grad / Esp</th>
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

    <div class="box-info">
      <strong>SERVIÇO A REALIZAR / LOCAL:</strong><br>
      ${d.servico_local || 'Participar de missão de interesse da Administração Militar.'}
    </div>

    <div class="box-info">
      <strong>APOIO RECEBIDO:</strong><br>
      ${d.apoio_recebido || 'Apoio de hospedagem e rancho serão prestados pelo (NOME DA UNIDADE), e o apoio de transporte será prestado pela AFA.'}
    </div>

    <div class="box-info">
      <strong>ENQUADRAMENTO LEGAL:</strong> baseado no Decreto nº 11.002, de 17 de março de 2022<br>
      <div style="margin-top:1.5mm">
        <span class="check-box">X</span> <strong>${art5}</strong>
      </div>
    </div>

    <div class="sec-title">I.2 MISSÕES REALIZADAS COM CRÉDITO DE PASSAGENS DE OUTRA ORGANIZAÇÃO</div>
    <div class="box-info">${d.passagens_outra_om || 'Não se aplica.'}</div>

    <div class="sec-title">I.3 PAGAMENTO ANTECIPADO DA GRATIFICAÇÃO DE REPRESENTAÇÃO</div>
    <div class="box-info">
      NECESSIDADE DE PAGAMENTO ANTECIPADO : [ ${antecipado ? 'X' : ' '} ] SIM &nbsp;&nbsp;&nbsp; [ ${!antecipado ? 'X' : ' '} ] NÃO<br>
      <strong>JUSTIFICATIVA:</strong> ${antecipado ? (d.justificativa_antecipacao || 'Necessidade de custeio inicial.') : 'Não se Aplica'}
    </div>

    <div class="sec-title">I.4 JUSTIFICATIVA PARA O NÃO CUMPRIMENTO DO PRAZO PREVISTO NO §1º DO ART. 10º DA PORTARIA GABAER / GC4 Nº1636, DE 20 DE MAIO DE 2026.</div>
    <div class="box-info">
      <strong>JUSTIFICATIVA:</strong> ${justPrazoTxt}
    </div>

    <div class="ass-block">
      Pirassununga - SP, ${d.data_os_fmt || new Date().toLocaleDateString('pt-BR')}<br>
      <div class="ass-digital">Assinado Digitalmente</div>
      <div class="ass-nome">${d.comandante_nome || 'Brig Ar GUSTAVO PESTANA GARCEZ'}<br><small style="font-weight:400">${d.comandante_cargo || 'Comandante da Academia da Força Aérea'}</small></div>
    </div>
    </body></html>`;
  }

  // 2. Autorização para Pagamento
  function gerarAutorizacaoGratificacaoHtml(d) {
    const ano = d.ano || new Date().getFullYear();
    const numOs = d.num_os || '24/DE/' + ano;
    const antecipado = !!d.pagamento_antecipado;
    const pct = d.percentual || '2%';

    return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
    <title>AUTORIZACAO_${numOs.replace(/\//g, '_')}</title>
    <style>${estiloGratificacao()}</style></head><body>
    <div class="head-fab">
      COMANDO DA AERONÁUTICA<br>
      ACADEMIA DA FORÇA AÉREA
      <div class="doc-title">AUTORIZAÇÃO PARA PAGAMENTO DE GRATIFICAÇÃO DE REPRESENTAÇÃO Nº ${numOs}</div>
    </div>

    <p style="margin:6mm 0;text-align:justify;line-height:1.6">
      Autorizo o pagamento da gratificação de representação de <strong>${pct} (dois por cento)</strong> do soldo, pelo número de dias declarado ao lado de cada militar relacionado no item I.1 da Ordem de Serviço de designação específica nº <strong>${numOs}</strong>.
    </p>

    <div style="margin:5mm 0;line-height:1.6">
      <div style="margin-bottom:3mm">
        ( ${antecipado ? 'X' : '&nbsp;&nbsp;'} ) Autorizando também o pagamento antecipado, conforme justificativa constante do item I.3 da ordem de serviço de designação específica nº ${numOs}.
      </div>
      <div>
        ( ${!antecipado ? 'X' : '&nbsp;&nbsp;'} ) Não autorizando o pagamento antecipado, ficando ele condicionado e vinculado às informações constantes na ficha de apresentação por retorno de missão referente à Ordem de Serviço de designação específica nº ${numOs}.
      </div>
    </div>

    <div class="ass-block" style="margin-top:20mm;text-align:center">
      Brasilia-DF, ${d.data_autorizacao_fmt || '____ de _____________ de ' + ano}<br><br><br>
      <div style="font-weight:700;text-transform:uppercase">${d.chefe_nome || 'GABRIEL HENRIQUES DE OLIVEIRA FARIAS Cel Av'}</div>
      <div>${d.chefe_cargo || 'Chefe da 2SC'}</div>
    </div>
    </body></html>`;
  }

  // 3. Ficha de Apresentação por Retorno de Missão
  function gerarFichaApresentacaoGratificacaoHtml(d) {
    const ano = d.ano || new Date().getFullYear();
    const numOs = d.num_os || '24/DE/' + ano;
    const teveAlteracao = !!d.teve_alteracao_retorno;
    const militares = extrairMilitares(d);
    const primMilitar = militares[0] || {};

    const linhasRetorno = militares.map((m, idx) => `
      <tr>
        <td>${idx + 1}</td>
        <td>${m.posto_grad || ''} ${m.especialidade || ''}</td>
        <td><strong>${m.nome || ''}</strong> / ${m.cpf || '—'}</td>
        <td>${m.saram || '—'}</td>
        <td>${m.om || 'AFA'}</td>
        <td>${m.retorno_inicio_fmt || m.data_inicio_fmt || ''}<br>${m.retorno_hora_inicio || m.hora_inicio || '08:00'}<br>a ${m.retorno_fim_fmt || m.data_fim_fmt || ''}<br>${m.retorno_hora_fim || m.hora_fim || '18:00'}</td>
        <td><strong>${m.dias_retorno || m.dias || 1}</strong></td>
        <td>${m.passagem || 'NÃO'}</td>
      </tr>
    `).join('');

    const justRetornoTxt = teveAlteracao
      ? (d.justificativa_alteracao_retorno || 'Por motivos de trânsito, o militar retornou no horário informado na tabela abaixo.')
      : 'Não se aplica.';

    return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
    <title>FICHA_APRESENTACAO_${numOs.replace(/\//g, '_')}</title>
    <style>${estiloGratificacao()}</style></head><body>
    <div class="head-fab">
      COMANDO DA AERONÁUTICA<br>
      ACADEMIA DA FORÇA AÉREA
      <div class="doc-title" style="border-bottom:none">Ficha de Apresentação por Retorno de Missão referente à Ordem de Serviço de designação específica nº ${numOs}</div>
    </div>

    <div class="sec-title" style="margin-top:4mm">RELATO DO RESPONSÁVEL PELO SERVIÇO:</div>
    <p style="margin-bottom:2.5mm">
      Ocorreram, por motivo de força maior, alterações no local de realização do serviço e/ou nas datas de início/retorno autorizados inicialmente?
    </p>

    <div style="margin-bottom:3mm">
      ( ${teveAlteracao ? 'X' : '&nbsp;&nbsp;'} ) SIM, CONFORME TABELA ABAIXO &nbsp;&nbsp;&nbsp;&nbsp; ( ${!teveAlteracao ? 'X' : '&nbsp;&nbsp;'} ) NÃO
    </div>

    <div class="box-info">
      <strong>JUSTIFICATIVA:</strong> ${justRetornoTxt}
    </div>

    <table class="grid-doc">
      <thead>
        <tr>
          <th>Ordem</th>
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

    <div class="ass-block" style="margin-top:12mm">
      Pirassununga-SP, ${d.data_retorno_fmt || primMilitar.retorno_fim_fmt || primMilitar.data_fim_fmt || new Date().toLocaleDateString('pt-BR')}<br>
      <div style="margin-top:3mm;font-weight:600">Responsável pelo serviço:</div>
      <div class="ass-digital">assinado digitalmente</div>
      <div class="ass-nome">${primMilitar.nome || d.nome || ''} ${primMilitar.posto_grad || d.posto_grad || ''}</div>
    </div>
    </body></html>`;
  }

  // ── MÉTODOS PÚBLICOS DO MOTOR ──
  return {
    gerarDiasDeduzidos,
    gerarDescontoAuxilio,
    gerarTabelasCompiladas,

    // Gratificação de Representação
    gerarOSGratificacao: function(d, baixar = true) {
      const html = gerarOSGratificacaoHtml(d);
      if (baixar) baixarHtml(html, `OS_${(d.num_os || 'OS').replace(/\//g, '_')}.html`);
      return html;
    },

    gerarAutorizacaoGratificacao: function(d, baixar = true) {
      const html = gerarAutorizacaoGratificacaoHtml(d);
      if (baixar) baixarHtml(html, `AUTORIZACAO_${(d.num_os || 'OS').replace(/\//g, '_')}.html`);
      return html;
    },

    gerarFichaApresentacaoGratificacao: function(d, baixar = true) {
      const html = gerarFichaApresentacaoGratificacaoHtml(d);
      if (baixar) baixarHtml(html, `FICHA_APRESENTACAO_${(d.num_os || 'OS').replace(/\//g, '_')}.html`);
      return html;
    },

    compilarPacoteGratificacao: function(d) {
      this.gerarOSGratificacao(d, true);
      setTimeout(() => this.gerarAutorizacaoGratificacao(d, true), 400);
      setTimeout(() => this.gerarFichaApresentacaoGratificacao(d, true), 800);
    },

    // Compila os 3 documentos de auxílio transporte de uma vez
    compilarTodos: async function(comp, militares, secDecls, secDeclsPrev, urlPdfFn) {
      const prevFlag = Object.fromEntries(secDeclsPrev.map(d => [d.militar_id, d.zera_mes_seguinte]));
      const ativos = militares.filter(m => m.ativo);

      const dadosMilitares = ativos.map(m => {
        const d = secDecls.find(x => x.militar_id === m.id);
        const r = typeof calcularDecl === 'function'
          ? calcularDecl(comp, (d && d.dias) || {}, m, !!prevFlag[m.id])
          : { vig: m.valor_mensal, vDia: m.valor_diario, diasDescNum: 0, desconto: 0, final: m.valor_mensal, zerado: false };
        return { m, d, r };
      });

      // 1. Gera e baixa o documento DIAS A SEREM DEDUZIDOS
      gerarDiasDeduzidos(comp, dadosMilitares);

      // 2. Gera e baixa o documento DESCONTO AUXILIO TRANSPORTE
      setTimeout(() => {
        gerarDescontoAuxilio(comp, dadosMilitares);
      }, 400);

      // 3. Gera e baixa o documento TABELAS DE FREQUÊNCIA INDIVIDUAL
      setTimeout(() => {
        gerarTabelasCompiladas(comp, dadosMilitares, urlPdfFn);
      }, 800);
    }
  };
})();
