'use server'; 


import ical from 'node-ical';


type ConversionResult = {
  csvData?: string;
  error?: string;
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


export async function convertIcsToCsvAction(formData: FormData): Promise<ConversionResult> {
  try {
    const file = formData.get('file') as File;

    if (!file || file.size === 0) {
      return { error: 'Nenhum ficheiro enviado ou o ficheiro está vazio.' };
    }

    const icsData = await file.text();
    const events = ical.parseICS(icsData);
    const csvRows = [];
    
    // Cabeçalhos do CSV
    const headers = [
      'Assunto', 'Data de Início', 'Hora de Início', 'Data de Fim', 
      'Hora de Fim', 'Dia Inteiro', 'Descrição', 'Local'
    ];
    csvRows.push(headers.join(','));

    
    for (const k in events) {
      if (Object.prototype.hasOwnProperty.call(events, k)) {
        const event = events[k];
        if (event.type === 'VEVENT') {
          const startDate = event.start ? new Date(event.start) : null;
          const endDate = event.end ? new Date(event.end) : null;
          
          const isValidStartDate = startDate && !isNaN(startDate.getTime());
          const isValidEndDate = endDate && !isNaN(endDate.getTime());
          
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

    if (csvRows.length <= 1) {
        return { error: 'Nenhum evento válido encontrado no ficheiro .ics.' };
    }

    const csvContent = csvRows.join('\n');
    return { csvData: csvContent };

  } catch (error: any) {
    console.error('Erro na Server Action:', error);
    return { error: `Erro no servidor: ${error.message}` };
  }
}