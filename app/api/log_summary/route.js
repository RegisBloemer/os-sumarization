// app/api/log_summary/route.js
import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export const runtime = 'nodejs';

export async function POST(request) {
  try {
    const { original_text, initial_summary, improved_summary } = await request.json();

    // Caminho para o arquivo de histórico (na raiz do projeto)
    const filePath = path.join(process.cwd(), 'summaries_history.json');

    // Tenta ler o JSON existente (se não existir, inicializa como array vazio)
    let existingData = [];
    try {
      const raw = await fs.readFile(filePath, 'utf-8');
      existingData = JSON.parse(raw);
      if (!Array.isArray(existingData)) existingData = [];
    } catch (err) {
      if (err.code !== 'ENOENT') {
        console.error('[log_summary] Erro ao ler summaries_history.json:', err);
        return NextResponse.json({ error: 'Falha ao ler o histórico' }, { status: 500 });
      }
      existingData = [];
    }

    // Gera o timestamp no fuso horário de São Paulo (pt-BR)
    const timestamp_sp = new Date().toLocaleString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    // Exemplo de valor gerado: "02/06/2025 11:37:45"

    const newEntry = {
      original_text,
      initial_summary,
      improved_summary,
      timestamp: timestamp_sp
    };

    existingData.push(newEntry);

    await fs.writeFile(filePath, JSON.stringify(existingData, null, 2), 'utf-8');
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[log_summary] Erro interno:', error);
    return NextResponse.json({ error: 'Erro interno ao salvar histórico' }, { status: 500 });
  }
}
