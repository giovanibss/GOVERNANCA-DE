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

  const logoAfa = 'assets/cocar-fab.png';

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
      <div class="logo-area"><img src="${logoAfa}" alt="AFA" /><span>AFA</span></div>
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
    <style>${estiloBase}
      .titulo-tabela{background:#0a1730;color:#fff;text-align:center;font-size:10.5pt;font-weight:700;
        letter-spacing:.08em;text-transform:uppercase;padding:3mm;margin-bottom:4mm;border-radius:1.5mm}
    </style></head><body>
    <div class="titulo-tabela">DESCONTO AUXÍLIO TRANSPORTE REFERENTE A ${mesNome}/${ano}</div>
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

        if (!util) {
          mS = mN = tS = tN = motRotulo = '–';
        } else if (mot === 'UTILIZADO') {
          mS = 'X'; tS = 'X'; motRotulo = 'Utilizado';
        } else if (mot === 'ENTRANDO_SERVICO') {
          mS = 'X'; tN = 'X'; motRotulo = 'Entrando de Serviço';
        } else if (mot === 'SAINDO_SERVICO') {
          mN = 'X'; tS = 'X'; motRotulo = 'Saindo de Serviço';
        } else if (mot === 'FERIADO') {
          mN = 'X'; tN = 'X'; motRotulo = 'Feriado';
        } else if (mot === 'SEM_EXPEDIENTE') {
          mN = 'X'; tN = 'X'; motRotulo = 'Sem Expediente';
        } else if (mot) {
          mN = 'X'; tN = 'X'; motRotulo = mot;
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
        <div style="border:1pt solid #0a1730;padding:2mm 4mm;margin-bottom:3mm;display:flex;justify-space-between;align-items:center">
          <div>
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
    <script>window.onload=()=>window.print();<\/script>
    </body></html>`;

    baixarHtml(htmlCompleto, `TABELAS_DE_FREQUENCIA_INDIVIDUAL_${mesAbrev}_${ano}.html`);
  }

  // ── MÉTODOS PÚBLICOS DO MOTOR ──
  return {
    gerarDiasDeduzidos,
    gerarDescontoAuxilio,
    gerarTabelasCompiladas,

    // Compila os 3 documentos de uma vez
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
