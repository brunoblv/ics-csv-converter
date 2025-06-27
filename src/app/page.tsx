// O Next.js 15 com App Router permite que você crie componentes de cliente e servidor.
// Este arquivo representa a página principal da sua aplicação.
// Coloque este código em `app/page.tsx`

"use client";

import { useState } from 'react';
import { Upload, FileText, Download, Loader2 } from 'lucide-react';

// Componente principal da aplicação
export default function App() {
  const [file, setFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Função para lidar com a seleção do arquivo
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.name.endsWith('.ics')) {
        setFile(selectedFile);
        setError(null);
        setCsvData(null);
      } else {
        setError("Por favor, selecione um arquivo .ics válido.");
        setFile(null);
      }
    }
  };

  // Função para enviar o arquivo para a API e iniciar a conversão
  const handleConvert = async () => {
    if (!file) {
      setError("Nenhum arquivo selecionado.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setCsvData(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/convert', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Erro na conversão: ${response.statusText}`);
      }

      const csvContent = await response.text();
      setCsvData(csvContent);

    } catch (err: any) {
      setError(err.message || "Ocorreu um erro desconhecido.");
      console.error("Erro de conversão:", err);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Função para acionar o download do arquivo CSV gerado
  const handleDownload = () => {
    if (!csvData) return;

    // O \uFEFF (BOM) é crucial para o Excel abrir o CSV com a codificação UTF-8 corretamente
    // e exibir caracteres como 'ç', 'ã', 'é', etc.
    const blob = new Blob(['\uFEFF' + csvData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    // Define o nome do arquivo para download
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
            <p className="text-slate-500 mt-2">Converta seus eventos de calendário com suporte a caracteres do português (ç, ã, é).</p>
          </div>

          <div className="space-y-6">
            {/* Área de Upload */}
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
                accept=".ics"
                onChange={handleFileChange}
              />
              {file && (
                <p className="text-sm text-slate-600 mt-4 font-medium">
                  Arquivo selecionado: <span className="text-slate-800">{file.name}</span>
                </p>
              )}
            </div>
            
            {error && (
              <p className="text-sm text-red-600 bg-red-100 p-3 rounded-lg text-center">{error}</p>
            )}

            {/* Botões de Ação */}
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={handleConvert}
                disabled={!file || isLoading}
                className="flex-1 inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-300 shadow-sm"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="animate-spin -ml-1 mr-3 h-5 w-5" />
                    Convertendo...
                  </>
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
            <p className="text-sm text-slate-500">Criado com Next.js 15</p>
        </footer>
      </div>
    </div>
  );
}

