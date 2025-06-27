import { NextResponse } from 'next/server';
import ical from 'node-ical';


export const config = {
  api: {
    bodyParser: {
      sizeLimit: '2mb', 
    },
  },
};


const escapeCsvField = (field: any): string => {
  if (field === null || field === undefined) {
    return '';
  }
  const stringField = String(field);

  if (/[",\n\r]/.test(stringField)) {
    return `"${stringField.replace(/"/g, '""')}"`;
  }
  return stringField;
};


export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ message: 'Nenhum arquivo enviado.' }, { status: 400 });
    }

    if (file.type !== 'text/calendar') {
        console.warn(`Tipo de arquivo inesperado: ${file.type}. Prosseguindo com a conversão.`);
    }

    const icsData = await file.text();

    if (!icsData) {
        return NextResponse.json({ message: 'O arquivo .ics está vazio ou não pôde ser lido.' }, { status: 400 });
    }

    const events = ical.parseICS(icsData);
    const csvRows = [];
    
    // Cabeçalhos do CSV
    const headers = [
      'Assunto', 
      'Data de Início', 
      'Hora de Início', 
      'Data de Fim', 
      'Hora de Fim', 
      'Dia Inteiro',
      'Descrição', 
      'Local'
    ];
    csvRows.push(headers.join(','));

 
    for (const k in events) {
      if (events.hasOwnProperty(k)) {
        const event = events[k];
        if (event.type === 'VEVENT') {
          const startDate = event.start ? new Date(event.start) : null;
          const endDate = event.end ? new Date(event.end) : null;
          
          // Verifica se a data é válida
          const isValidStartDate = startDate && !isNaN(startDate.getTime());
          const isValidEndDate = endDate && !isNaN(endDate.getTime());
          
          // 'datetype' pode indicar um evento de dia inteiro
          const isAllDay = event.datetype === 'date' || (isValidStartDate && isValidEndDate && (endDate.getTime() - startDate.getTime()) >= (24 * 60 * 60 * 1000 - 1000) );

          const formatOptionsDate: Intl.DateTimeFormatOptions = { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'America/Sao_Paulo' };
          const formatOptionsTime: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: 'America/Sao_Paulo' };
          
          const row = [
            escapeCsvField(event.summary || ''),
            isValidStartDate ? startDate.toLocaleDateString('pt-BR', formatOptionsDate) : '',
            (isValidStartDate && !isAllDay) ? startDate.toLocaleTimeString('pt-BR', formatOptionsTime) : '',
            isValidEndDate ? endDate.toLocaleDateString('pt-BR', formatOptionsDate) : '',
            (isValidEndDate && !isAllDay) ? endDate.toLocaleTimeString('pt-BR', formatOptionsTime) : '',
            isAllDay ? 'Sim' : 'Não',
            escapeCsvField(event.description || ''),
            escapeCsvField(event.location || ''),
          ];
          
          csvRows.push(row.join(','));
        }
      }
    }

    const csvContent = csvRows.join('\n');

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="calendario.csv"',
      },
    });

  } catch (error: any) {
    console.error('Erro na API:', error);
    return NextResponse.json({ message: `Erro no servidor: ${error.message}` }, { status: 500 });
  }
}