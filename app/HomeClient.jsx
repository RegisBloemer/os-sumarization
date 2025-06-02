'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Container,
  TextField,
  Button,
  Typography,
  Box,
  Card,
  CardContent,
  Paper,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export default function Home() {
  const searchParams = useSearchParams();
  const tsParam = searchParams.get('ts');

  const [text, setText] = useState('');
  const [summary, setSummary] = useState('');
  const [improved, setImproved] = useState('');
  const [currentTimestamp, setCurrentTimestamp] = useState(null);
  const [loading, setLoading] = useState(false);
  const [hasReceivedChunk, setHasReceivedChunk] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Analisando o texto...');
  
  const [showBothVersions, setShowBothVersions] = useState(false);
  const [resumeStyle, setResumeStyle] = useState('balanced');
  const [resumeLength, setResumeLength] = useState('medium');
  const [selectedText, setSelectedText] = useState('');

  const loadingMessages = [
    "Analisando o texto...",
    "Reunindo principais pontos...",
    "Processando resumo...",
    "Organizando ideias..."
  ];

  // Ciclo de mensagens durante streaming
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

  /**
   * Helper para consumir streams (API /api/sumarize, /api/verify, etc.)
   * Recebe:
   *  - url: string
   *  - payload: objeto que será enviado no body
   *  - onChunk: callback(text: string) chamado a cada fragmento recebido
   */
  const streamFetch = async ({ url, payload, onChunk }) => {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`Erro ${res.status}`);
    if (!res.body) throw new Error('Sem body no stream');

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let done = false;

    while (!done) {
      const { value, done: d } = await reader.read();
      done = d;
      if (value) {
        onChunk(decoder.decode(value));
      }
    }
  };

  // Se houver tsParam na URL, buscar o registro para pré-carregar campos
  useEffect(() => {
    if (!tsParam) return;

    async function fetchRecord() {
      try {
        const res = await fetch(`/api/get_summary?ts=${encodeURIComponent(tsParam)}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        // Esperamos { original_text, initial_summary, improved_summary }
        setText(json.original_text);
        setSummary(json.initial_summary);
        setImproved(json.improved_summary);
        setCurrentTimestamp(tsParam);
      } catch (err) {
        console.error('Erro ao carregar registro para edição:', err);
      }
    }

    fetchRecord();
  }, [tsParam]);

  // Chamado ao clicar em "Resumir"
  const handleSummarize = async () => {
    setLoading(true);
    setHasReceivedChunk(false);
    setSummary('');
    setImproved('');
    setSelectedText('');
    setCurrentTimestamp(null);

    let initialSummaryBuffer = '';
    let improvedSummaryBuffer = '';

    try {
      // 1️⃣ Gera o resumo inicial
      await streamFetch({
        url: '/api/sumarize',
        payload: {
          text,
          style: resumeStyle,
          length: resumeLength,
        },
        onChunk: (chunk) => {
          if (!hasReceivedChunk) setHasReceivedChunk(true);
          initialSummaryBuffer += chunk;
          setSummary((prev) => prev + chunk);
        },
      });

      // 2️⃣ Gera o resumo melhorado (verify)
      setHasReceivedChunk('verify');
      setLoadingMessage('Verificando resumo...');
      await streamFetch({
        url: '/api/verify',
        payload: {
          text,
          summary: initialSummaryBuffer,
          style: resumeStyle,
          length: resumeLength,
        },
        onChunk: (chunk) => {
          improvedSummaryBuffer += chunk;
          setImproved((prev) => prev + chunk);
        },
      });

      // 3️⃣ Registra no histórico (cria novo objeto no JSON)
      await fetch('/api/log_summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          original_text: text,
          initial_summary: initialSummaryBuffer,
          improved_summary: improvedSummaryBuffer,
        }),
      });

      toast.success('Resumo criado e salvo no histórico!');
    } catch (err) {
      console.error(err);
      toast.error('Erro no processamento.');
    } finally {
      setLoading(false);
    }
  };

  // Chamado ao clicar em "Melhorar este trecho"
  const handleImproveSection = async () => {
    if (!selectedText) return;
    setLoading(true);

    try {
      let improvedSection = '';
      await streamFetch({
        url: '/api/improve-section',
        payload: {
          text,
          fullSummary: improved,
          selectedSection: selectedText,
        },
        onChunk: (chunk) => {
          improvedSection += chunk;
        },
      });

      // Substitui localmente
      const newImproved = improved.replace(selectedText, improvedSection);
      setImproved(newImproved);

      // Se estivermos editando um resumo existente, atualiza no JSON
      if (currentTimestamp) {
        await fetch('/api/update_summary', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            timestamp: currentTimestamp,
            improved_summary: newImproved,
          }),
        });
        toast.success('Resumo atualizado no histórico!');
      } else {
        toast.success('Trecho melhorado em tela (não salvo em histórico).');
      }

      setSelectedText('');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao melhorar o trecho.');
    } finally {
      setLoading(false);
    }
  };

  // Captura o texto selecionado em “improved”
  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim()) {
      setSelectedText(selection.toString().trim());
    }
  };

  // Copia "improved" para a área de transferência
  const handleCopy = () => {
    navigator.clipboard.writeText(improved)
      .then(() => toast.success('Resumo copiado!'))
      .catch(console.error);
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      {/* Botão para ir ao histórico */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <Button component={Link} href="/history" variant="outlined">
          Ver Histórico de Resumos
        </Button>
      </Box>

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
            onChange={(e) => setText(e.target.value)}
            variant="outlined"
            margin="normal"
          />
          
          <Box sx={{ display: 'flex', gap: 2, mt: 2, mb: 2 }}>
            <FormControl size="small" fullWidth>
              <InputLabel>Estilo</InputLabel>
              <Select 
                value={resumeStyle} 
                onChange={(e) => setResumeStyle(e.target.value)}
                label="Estilo"
              >
                <MenuItem value="balanced">Equilibrado</MenuItem>
                <MenuItem value="academic">Acadêmico</MenuItem>
                <MenuItem value="simple">Simplificado</MenuItem>
              </Select>
            </FormControl>
            
            <FormControl size="small" fullWidth>
              <InputLabel>Tamanho</InputLabel>
              <Select 
                value={resumeLength} 
                onChange={(e) => setResumeLength(e.target.value)}
                label="Tamanho"
              >
                <MenuItem value="short">Curto</MenuItem>
                <MenuItem value="medium">Médio</MenuItem>
                <MenuItem value="detailed">Detalhado</MenuItem>
              </Select>
            </FormControl>
          </Box>
          
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
          <Box display="flex" alignItems="center" mb={1}>
            <Typography variant="h6" sx={{ flexGrow: 1 }}>
              Resumo:
            </Typography>
            <Button 
              size="small" 
              variant="outlined"
              onClick={() => setShowBothVersions(!showBothVersions)}
            >
              {showBothVersions ? "Ocultar Original" : "Mostrar Ambos"}
            </Button>
          </Box>
          
          {showBothVersions && (
            <Paper sx={{ p:2, mb:2, bgcolor: '#f5f5f5' }}>
              <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                Versão inicial:
              </Typography>
              <Typography sx={{ whiteSpace:'pre-wrap' }}>
                {summary}
              </Typography>
            </Paper>
          )}
          
          <Paper sx={{ p:2, minHeight:'100px' }}>
            <Typography variant="subtitle2" color="textSecondary" gutterBottom>
              {showBothVersions ? "Versão final:" : ""}
            </Typography>
            <Typography 
              sx={{ whiteSpace:'pre-wrap' }}
              onMouseUp={handleTextSelection}
            >
              {improved}
            </Typography>
            
            {selectedText && (
              <Box mt={2} p={1} border="1px dashed #ccc" borderRadius={1}>
                <Typography variant="body2" color="textSecondary" gutterBottom>
                  Trecho selecionado:
                </Typography>
                <Typography variant="body2" fontStyle="italic" gutterBottom>
                  "{selectedText}"
                </Typography>
                <Box mt={1} display="flex" gap={1}>
                  <Button 
                    size="small" 
                    variant="outlined"
                    onClick={handleImproveSection}
                    disabled={loading}
                  >
                    Melhorar este trecho
                  </Button>
                  <Button 
                    size="small"
                    onClick={() => setSelectedText('')}
                  >
                    Cancelar
                  </Button>
                </Box>
              </Box>
            )}
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
    