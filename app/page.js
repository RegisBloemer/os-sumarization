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
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Resumindo...');
  const [hasReceivedChunk, setHasReceivedChunk] = useState(false);

  const loadingMessages = [
    "Analisando o texto...",
    "Reunindo principais pontos...",
    "Processando resumo...",
    "Organizando ideias..."
  ];

  useEffect(() => {
    let interval;
    if (loading) {
      if (!hasReceivedChunk) {
        let index = 0;
        setLoadingMessage(loadingMessages[index]);
        interval = setInterval(() => {
          index = (index + 1) % loadingMessages.length;
          setLoadingMessage(loadingMessages[index]);
        }, 3000); // Intervalo de 3 segundos
      } else {
        setLoadingMessage("Gerando Resumo");
      }
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [loading, hasReceivedChunk]);

  const handleSummarize = async () => {
    setLoading(true);
    setHasReceivedChunk(false);
    setSummary('');

    try {
      const response = await fetch('./api/sumarize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text })
      });

      if (!response.body) {
        throw new Error("Não há streaming body na resposta");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');

      let done = false;
      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        
        if (value) {
          if (!hasReceivedChunk) {
            setHasReceivedChunk(true);
          }
          const chunk = decoder.decode(value);
          setSummary((prev) => prev + chunk);
        }
      }
    } catch (error) {
      console.error("Erro ao resumir:", error);
    }

    setLoading(false);
  };

  const handleCopySummary = () => {
    navigator.clipboard.writeText(summary)
      .then(() => {
        toast.success("Seu resumo está pronto!", {
          position: "top-right",
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        });
      })
      .catch((err) => {
        console.error("Erro ao copiar resumo:", err);
      });
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Typography variant="h4" align="center" gutterBottom>
        Resumidor de Texto
      </Typography>

      <Card>
        <CardContent>
          <Typography variant="subtitle1" gutterBottom>
            Digite ou cole seu texto abaixo:
          </Typography>
          <TextField
            label="Texto"
            multiline
            rows={8}
            fullWidth
            value={text}
            onChange={(e) => setText(e.target.value)}
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
                  <CircularProgress size={20} sx={{ mr: 1 }} />
                  {loadingMessage}
                </>
              ) : (
                'Resumir'
              )}
            </Button>
          </Box>
        </CardContent>
      </Card>

      <Box mt={4}>
        <Typography variant="h6" gutterBottom>
          Resumo:
        </Typography>
        <Paper sx={{ p: 2, minHeight: '100px' }}>
          <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
            {summary}
          </Typography>
        </Paper>
        {summary && (
          <Box mt={2} display="flex" justifyContent="center">
            <Button variant="outlined" onClick={handleCopySummary}>
              Copiar Resumo
            </Button>
          </Box>
        )}
      </Box>
      <ToastContainer />
    </Container>
  );
}
