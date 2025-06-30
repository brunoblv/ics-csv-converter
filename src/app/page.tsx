"use client";

import { useState, useEffect } from 'react';
import { Upload, FileText, Download, Loader2 } from 'lucide-react';


const ICAL_JS_URL = "https://cdn.jsdelivr.net/npm/ical.js/build/ical.min.js";

export default function App() {
  const [file, setFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);

 
  useEffect(() => {
    
    if (document.querySelector(`script[src="${ICAL_JS_URL}"]`)) {
        setIsScriptLoaded(true);
        return;
    }

    const script = document.createElement('script');
    script.src = ICAL_JS_URL;
    script.async = true;
    script.onload = () => {
        console.log("ical.js carregado com sucesso.");
        setIsScriptLoaded(true);
    };
    script.onerror = () => {
        setError("Falha ao carregar a biblioteca de conversão. Por favor, recarregue a página.");
    };
    document.body.appendChild(script);

    
    return () => {
        const existingScript = document.querySelector(`script[src="${ICAL_JS_URL}"]`);
        if (existingScript) {
            document.body.removeChild(existingScript);
        }
    };
  }, []);


  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.name.endsWith('.ics')) {
        setFile(selectedFile);
        setError(null);
        setCsvData(null);
      } else {
        setError("Por favor, selecione um ficheiro .ics válido.");
        setFile(null);
      }
    }
  };

 
  const handleConvert = () => {
    if (!file) {
      setError("Nenhum ficheiro selecionado.");
      return;
    }
    if (!isScriptLoaded || typeof (window as any).ICAL === 'undefined') {
      setError("A biblioteca de conversão ainda não está pronta. Por favor, aguarde um momento e tente novamente.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setCsvData(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const icsData = e.target?.result;
        if (typeof icsData !== 'string') {
            throw new Error("Não foi possível ler o conteúdo do ficheiro.");
        }
        
        const ICAL = (window as any).ICAL;
        const jcalData = ICAL.parse(icsData);
        const vcalendar = new ICAL.Component(jcalData);
        const vevents = vcalendar.getAllSubcomponents('vevent');

        const csvRows = [];
       
        const headers = [
            'Coluna 1', 'Coluna 2', 'Coluna 3', 'Nome', 'Documento', 'Atendente', 'Setor', 'Processo',
            'Data de Início', 'Hora de Início', 'Data de Fim', 'Hora de Fim', 'Dia Inteiro',
            'Descrição Original', 'Local'
        ];
        csvRows.push(headers.join(';'));

        const formatOptionsDate: Intl.DateTimeFormatOptions = { year: 'numeric', month: '2-digit', day: '2-digit' };
        const formatOptionsTime: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false };

        vevents.forEach((eventComponent: any) => {
            const event = new ICAL.Event(eventComponent);
            
            const startDate = event.startDate.toJSDate();
            const endDate = event.endDate.toJSDate();
            const isAllDay = event.isAllDay;

            const quote = (field: any): string => {
                const str = String(field || '').replace(/"/g, '""').replace(/(\r\n|\n|\r)/gm, " "); 
                return `"${str.trim()}"`;
            };

           
            const summaryText = event.summary || '';
            const summaryParts = summaryText.split(';');

            
            const MAX_SUMMARY_PARTS = 8; 
            const paddedSummaryParts = new Array(MAX_SUMMARY_PARTS).fill('');
            for (let i = 0; i < MAX_SUMMARY_PARTS; i++) {
                if (i < summaryParts.length) {
                    paddedSummaryParts[i] = summaryParts[i];
                }
            }

            const row = [
                ...paddedSummaryParts.map(part => quote(part)), 
                startDate.toLocaleDateString('pt-BR', formatOptionsDate),
                isAllDay ? '' : startDate.toLocaleTimeString('pt-BR', formatOptionsTime),
                endDate.toLocaleDateString('pt-BR', formatOptionsDate),
                isAllDay ? '' : endDate.toLocaleTimeString('pt-BR', formatOptionsTime),
                isAllDay ? 'Sim' : 'Não',
                quote(event.description), 
                quote(event.location),
            ];
            csvRows.push(row.join(';'));
        });

        if (csvRows.length <= 1) {
            setError('Nenhum evento válido encontrado no ficheiro .ics.');
            setCsvData(null);
        } else {
            setCsvData(csvRows.join('\n'));
        }
      } catch (err: any) {
        setError(`Erro ao processar o ficheiro .ics: ${err.message}. Verifique se o formato do ficheiro é válido.`);
        console.error("Erro de conversão:", err);
      } finally {
        setIsLoading(false);
      }
    };

    reader.onerror = () => {
        setError("Ocorreu um erro ao ler o ficheiro.");
        setIsLoading(false);
    };

    reader.readAsText(file, 'UTF-8');
  };
  
  const handleDownload = () => {
    if (!csvData) return;
    const blob = new Blob(['\uFEFF' + csvData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const originalFileName = file?.name.replace(/\.ics$/, '') || 'calendario';
    link.setAttribute('download', `${originalFileName}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-slate-50 min-h-screen flex items-center justify-center font-sans">
      <div className="w-full max-w-2xl mx-auto p-6 md:p-8">
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8 md:p-12">
          <div className="text-center mb-10">
            <FileText className="mx-auto h-12 w-12 text-blue-500" />
            <h1 className="text-3xl font-bold text-slate-800 mt-4">Conversor de .ICS para .CSV</h1>
            <p className="text-slate-500 mt-2">Converta os seus eventos de calendário com suporte para caracteres do português (ç, ã, é).</p>
          </div>

          <div className="space-y-6">
            <div className="relative border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-blue-500 transition-colors duration-300">
              <Upload className="mx-auto h-8 w-8 text-slate-400 mb-2" />
              <label htmlFor="file-upload" className="cursor-pointer">
                <span className="font-semibold text-blue-600">Clique para enviar um arquivo</span>
                <span className="text-slate-500"> ou arraste e solte</span>
              </label>
              <input 
                id="file-upload" 
                name="file-upload"
                type="file" 
                className="sr-only" 
                accept=".ics,text/calendar"
                onChange={handleFileChange}
              />
              {file && (
                <p className="text-sm text-slate-600 mt-4 font-medium">
                  Ficheiro selecionado: <span className="text-slate-800">{file.name}</span>
                </p>
              )}
            </div>
            
            {error && (
              <p className="text-sm text-red-600 bg-red-100 p-3 rounded-lg text-center">{error}</p>
            )}

            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={handleConvert}
                disabled={!file || isLoading || !isScriptLoaded}
                className="flex-1 inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-300 shadow-sm"
              >
                {isLoading ? (
                  <><Loader2 className="animate-spin -ml-1 mr-3 h-5 w-5" />A converter...</>
                ) : !isScriptLoaded ? (
                  <><Loader2 className="animate-spin -ml-1 mr-3 h-5 w-5" />A carregar...</>
                ) : 'Converter para CSV'}
              </button>

              {csvData && (
                <button
                  onClick={handleDownload}
                  className="flex-1 inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-green-700 bg-green-100 hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all duration-300"
                >
                  <Download className="-ml-1 mr-3 h-5 w-5" />
                  Baixar CSV
                </button>
              )}
            </div>
          </div>
        </div>
        <footer className="text-center mt-8">
            <p className="text-sm text-slate-500">SMUL - Secretaria Municipal de Urbanismo e Licenciamento</p>
        </footer>
      </div>
    </div>
  );
}