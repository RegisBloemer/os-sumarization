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
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Divider
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
  
  // Novos estados para as funcionalidades adicionais
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
    setSelectedText(''); // Reset any selected text
  
    try {
      // 1️⃣ gera o resumo (não exibido ao usuário)
      await streamFetch({
        url: '/api/sumarize',
        payload: { 
          text,
          style: resumeStyle,
          length: resumeLength 
        },
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
        payload: { 
          text, 
          summary,
          style: resumeStyle,
          length: resumeLength 
        },
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
          selectedSection: selectedText 
        },
        onChunk: chunk => {
          improvedSection += chunk;
        }
      });
      
      // Substitui o trecho selecionado pelo trecho melhorado
      const newImproved = improved.replace(selectedText, improvedSection);
      setImproved(newImproved);
      
      toast.success('Trecho melhorado com sucesso!');
      setSelectedText('');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao melhorar o trecho.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim()) {
      setSelectedText(selection.toString().trim());
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
          
          {/* Opções de personalização (Item 3) */}
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
            {/* Botão para mostrar/ocultar versão original (Item 2) */}
            <Button 
              size="small" 
              variant="outlined"
              onClick={() => setShowBothVersions(!showBothVersions)}
            >
              {showBothVersions ? "Ocultar Original" : "Mostrar Ambos"}
            </Button>
          </Box>
          
          {/* Exibe resumo original quando solicitado (Item 2) */}
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
          
          {/* Resumo melhorado com suporte para seleção de texto (Item 4) */}
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
            
            {/* Interface de feedback para texto selecionado (Item 4) */}
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
  