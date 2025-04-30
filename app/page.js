// src/app/page.jsx (ou onde estiver seu componente Home)
'use client';

import { useState, useEffect } from 'react';
import {
  Container,
  TextField,
  Button,
  Typography,
  Box,
  Card,
  CardContent,
  Paper,
  CircularProgress
} from '@mui/material';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export default function Home() {
  const [text, setText] = useState('');
  const [summary, setSummary] = useState('');       // usado apenas internamente
  const [improved, setImproved] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasReceivedChunk, setHasReceivedChunk] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Analisando o texto...');

  const loadingMessages = [
    "Analisando o texto...",
    "Reunindo principais pontos...",
    "Processando resumo...",
    "Organizando ideias..."
  ];

  // faz o “carrossel” durante a geração do resumo
  useEffect(() => {
    if (!loading || hasReceivedChunk === 'verify') return;
    let idx = 0;
    setLoadingMessage(loadingMessages[idx]);
    const iv = setInterval(() => {
      idx = (idx + 1) % loadingMessages.length;
      setLoadingMessage(loadingMessages[idx]);
    }, 3000);
    return () => clearInterval(iv);
  }, [loading, hasReceivedChunk]);

  // helper genérico de streaming
  const streamFetch = async ({ url, payload, onChunk }) => {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error(`Erro ${res.status}`);
    if (!res.body) throw new Error('Sem body no stream');
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let done = false;
    while (!done) {
      const { value, done: d } = await reader.read();
      done = d;
      if (value) onChunk(decoder.decode(value));
    }
  };

  const handleSummarize = async () => {
    setLoading(true);
    setHasReceivedChunk(false);
    setSummary('');
    setImproved('');

    try {
      // 1️⃣ gera o resumo (não exibido ao usuário)
      await streamFetch({
        url: '/api/sumarize',
        payload: { text },
        onChunk: chunk => {
          if (!hasReceivedChunk) setHasReceivedChunk(true);
          setSummary(prev => prev + chunk);
        }
      });

      // 2️⃣ auto-dispara verify e exibe somente ele
      setHasReceivedChunk('verify');
      setLoadingMessage('Verificando resumo...');
      await streamFetch({
        url: '/api/verify',
        payload: { text, summary },
        onChunk: chunk => {
          setImproved(prev => prev + chunk);
        }
      });

      toast.success('Resumo pronto!');
    } catch (err) {
      console.error(err);
      toast.error('Erro no processamento.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(improved)
      .then(() => toast.success('Resumo copiado!'))
      .catch(console.error);
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Typography variant="h4" align="center" gutterBottom>
        Resumidor de Texto
      </Typography>

      <Card>
        <CardContent>
          <TextField
            label="Texto"
            multiline
            rows={8}
            fullWidth
            value={text}
            onChange={e => setText(e.target.value)}
            variant="outlined"
            margin="normal"
          />
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
            <Button
              variant="contained"
              onClick={handleSummarize}
              disabled={loading || !text.trim()}
            >
              {loading ? (
                <>
                  <CircularProgress size={20} sx={{ mr:1 }} />
                  {loadingMessage}
                </>
              ) : 'Resumir'}
            </Button>
          </Box>
        </CardContent>
      </Card>

      {improved && (
        <Box mt={4}>
          <Typography variant="h6">Resumo:</Typography>
          <Paper sx={{ p:2, minHeight:'100px' }}>
            <Typography sx={{ whiteSpace:'pre-wrap' }}>
              {improved}
            </Typography>
          </Paper>
          <Box mt={1} display="flex" justifyContent="center">
            <Button variant="outlined" onClick={handleCopy}>
              Copiar Resumo
            </Button>
          </Box>
        </Box>
      )}

      <ToastContainer position="top-right" autoClose={3000} />
    </Container>
  );
}
  