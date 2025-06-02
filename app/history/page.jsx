import fs from 'fs/promises';
import path from 'path';
import { Container, Typography } from '@mui/material';
import HistoryTable from './HistoryTable';

export default async function HistoryPage() {
  // 1) Determina o caminho para o arquivo JSON de histórico
  //    Se você salvou em 'data/summaries_history.json', mude a rota abaixo para 'data'
  const filePath = path.join(process.cwd(), 'summaries_history.json');

  // 2) Lê o arquivo JSON (ou inicializa array vazio se ele não existir)
  let data = [];
  try {
    const raw = await fs.readFile(filePath, 'utf-8');
    data = JSON.parse(raw);
    if (!Array.isArray(data)) {
      data = [];
    }
  } catch (err) {
    // Se o arquivo não existe (ENOENT) ou der outro erro, mantém data = []
    data = [];
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Histórico de Resumos
      </Typography>

      {data.length === 0 ? (
        <Typography>Nenhum resumo encontrado.</Typography>
      ) : (
        // Passa o array completo para o componente de tabela com paginação
        <HistoryTable data={data} />
      )}
    </Container>
  );
}
