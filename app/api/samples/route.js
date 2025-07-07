// app/api/samples/route.js
import { promises as fs } from 'fs';
import path from 'path';

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'data', 'wiki_samples.json');
    const raw = await fs.readFile(filePath, 'utf-8');
    const all = JSON.parse(raw);
    const samples = Array.isArray(all) ? all : [];
    return new Response(JSON.stringify(samples), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Erro ao ler wiki_samples.json:', err);
    return new Response(
      JSON.stringify({ error: 'Não foi possível carregar os samples.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
