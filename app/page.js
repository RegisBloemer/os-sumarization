'use client';

import { useState } from 'react';
import { Container, TextField, Button, Typography, Box } from '@mui/material';

export default function Home() {
  const [text, setText] = useState('');
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSummarize = async () => {
    setLoading(true);
    setSummary('');
    try {
      // Chama a API interna do Next que repassa o request para o Ollama
      const response = await fetch('./api/sumarize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text })
      });

      if (!response.body) throw new Error("Resposta sem stream");

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');

      let done = false;
      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        if (value) {
          const chunk = decoder.decode(value);
          setSummary(prev => prev + chunk);
        }
      }
    } catch (error) {
      console.error("Erro ao resumir:", error);
    }
    setLoading(false);
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 4 }}>
      <Typography variant="h4" gutterBottom>
        Resumidor de Texto
      </Typography>
      <TextField
        label="Digite o texto aqui"
        multiline
        rows={10}
        fullWidth
        value={text}
        onChange={(e) => setText(e.target.value)}
        variant="outlined"
        margin="normal"
      />
      <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
        <Button variant="contained" onClick={handleSummarize} disabled={loading}>
          {loading ? 'Resumindo...' : 'Resumir'}
        </Button>
      </Box>
      <Typography variant="h5" gutterBottom>
        Resumo:
      </Typography>
      <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
        {summary}
      </Typography>
    </Container>
  );
}
