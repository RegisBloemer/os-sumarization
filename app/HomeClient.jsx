// pages/index.js
'use client';

import { useState, useEffect, useRef } from 'react';
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
  // — samples & navegação
  const [samples, setSamples] = useState([]);
  const [sampleIdx, setSampleIdx] = useState(0);

  // — estados de UI / streaming
  const [text, setText] = useState('');
  const [summary, setSummary] = useState('');
  const [improved, setImproved] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasReceivedChunk, setHasReceivedChunk] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Analisando o texto...');
  const [showBothVersions, setShowBothVersions] = useState(false);
  const [resumeStyle, setResumeStyle] = useState('balanced');
  const [resumeLength, setResumeLength] = useState('medium');
  const [selectedText, setSelectedText] = useState('');
  const batchRef = useRef(null);

  const loadingMessages = [
    "Analisando o texto...",
    "Reunindo principais pontos...",
    "Processando resumo...",
    "Organizando ideias..."
  ];

  // — carrega até 100 samples
  useEffect(() => {
    fetch('/api/samples')
      .then(r => r.json())
      .then(arr => {
        setSamples(arr);
        if (arr.length) {
          setSamples(arr.slice(0, 100));
          setText(arr[0]);
        }
      })
      .catch(console.error);
  }, []);

  // — ciclo de mensagens de loading
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

  // — helper de streaming
  const streamFetch = async ({ url, payload, onChunk }) => {
    const res = await fetch(url, {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`Erro ${res.status}`);
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let done = false;
    while (!done) {
      const { value, done: d } = await reader.read();
      done = d;
      if (value) onChunk(decoder.decode(value));
    }
  };

  /**
   * Gera resumo inicial + verify para um dado inputText,
   * atualiza states de summary/improved e retorna o objeto para log.
   */
  const handleSummarize = async (inputText) => {
    setLoading(true);
    setHasReceivedChunk(false);
    setSummary('');
    setImproved('');

    let initialBuffer = '';
    let improvedBuffer = '';

    try {
      // 1️⃣ resumo inicial
      await streamFetch({
        url: '/api/sumarize',
        payload: { text: inputText, style: resumeStyle, length: resumeLength },
        onChunk: chunk => {
          if (!hasReceivedChunk) setHasReceivedChunk(true);
          initialBuffer += chunk;
          setSummary(prev => prev + chunk);
        },
      });

      // 2️⃣ resumo “verify”
      setHasReceivedChunk('verify');
      setLoadingMessage('Verificando resumo...');
      await streamFetch({
        url: '/api/verify',
        payload: {
          text: inputText,
          summary: initialBuffer,
          style: resumeStyle,
          length: resumeLength,
        },
        onChunk: chunk => {
          improvedBuffer += chunk;
          setImproved(prev => prev + chunk);
        },
      });

      return {
        original_text: inputText,
        initial_summary: initialBuffer,
        improved_summary: improvedBuffer,
      };
    } catch (err) {
      console.error('Erro em handleSummarize:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Batch: percorre cada sample, chama handleSummarize(sample),
   * faz o log imediato e atualiza a UI de sampleIdx/text.
   */
  const runBatch = async () => {
    if (!samples.length) return;
    batchRef.current.disabled = true;

    for (let i = 0; i < samples.length; i++) {
      const sampleText = samples[i];
      setSampleIdx(i);
      setText(sampleText);

      try {
        const record = await handleSummarize(sampleText);

        const res = await fetch('/api/log_summary', {
          method: 'POST',
          headers: {'Content-Type':'application/json'},
          body: JSON.stringify(record),
        });
        if (!res.ok) {
          console.error(`Erro salvando ${i+1}`, await res.text());
          toast.error(`Falha ao salvar ${i+1}`);
        } else {
          toast.success(`Resumo ${i+1} salvo.`);
        }
        // pausa leve
        await new Promise(r => setTimeout(r, 300));
      } catch {
        toast.error(`Erro no resumo ${i+1}`);
      }
    }

    batchRef.current.disabled = false;
    alert(`Concluído: ${samples.length} resumos gerados e salvos.`);
  };

  // — navegação manual
  const handlePrev = () => {
    if (sampleIdx > 0) {
      const i = sampleIdx - 1;
      setSampleIdx(i);
      setText(samples[i]);
    }
  };
  const handleNext = () => {
    if (sampleIdx < samples.length - 1) {
      const i = sampleIdx + 1;
      setSampleIdx(i);
      setText(samples[i]);
    }
  };

  // — captura seleção de trecho
  const handleTextSelection = () => {
    const sel = window.getSelection();
    if (sel && sel.toString().trim()) setSelectedText(sel.toString().trim());
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      {/* — histórico */}
      <Box sx={{ display:'flex', justifyContent:'flex-end', mb:2 }}>
        <Button component={Link} href="/history" variant="outlined">
          Ver Histórico
        </Button>
      </Box>

      <Typography variant="h4" align="center" gutterBottom>
        Resumidor de Texto
      </Typography>

      {/* — controles de navegação e batch */}
      <Box sx={{ display:'flex', gap:1, mb:2 }}>
        <Button onClick={handlePrev} disabled={sampleIdx===0}>← Anterior</Button>
        <Typography sx={{ flexGrow:1, textAlign:'center', py:1 }}>
          Exemplo {sampleIdx+1} de {samples.length}
        </Typography>
        <Button onClick={handleNext} disabled={sampleIdx===samples.length-1}>Próximo →</Button>
        <Button
          variant="contained"
          onClick={runBatch}
          ref={batchRef}
          sx={{ ml:2 }}
        >
          Resumir Todos ({samples.length})
        </Button>
      </Box>

      {/* — card de input */}
      <Card>
        <CardContent>
          <TextField
            label="Texto"
            multiline rows={8} fullWidth
            value={text}
            onChange={e=>setText(e.target.value)}
            margin="normal"
          />

          <Box sx={{ display:'flex', gap:2, mt:2, mb:2 }}>
            <FormControl size="small" fullWidth>
              <InputLabel>Estilo</InputLabel>
              <Select value={resumeStyle} onChange={e=>setResumeStyle(e.target.value)} label="Estilo">
                <MenuItem value="balanced">Equilibrado</MenuItem>
                <MenuItem value="academic">Acadêmico</MenuItem>
                <MenuItem value="simple">Simplificado</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" fullWidth>
              <InputLabel>Tamanho</InputLabel>
              <Select value={resumeLength} onChange={e=>setResumeLength(e.target.value)} label="Tamanho">
                <MenuItem value="short">Curto</MenuItem>
                <MenuItem value="medium">Médio</MenuItem>
                <MenuItem value="detailed">Detalhado</MenuItem>
              </Select>
            </FormControl>
          </Box>

          <Box sx={{ display:'flex', justifyContent:'center', mt:2 }}>
            <Button
              variant="contained"
              onClick={async () => {
                try {
                  const record = await handleSummarize(text);
                  const res = await fetch('/api/log_summary',{
                    method:'POST',
                    headers:{'Content-Type':'application/json'},
                    body:JSON.stringify(record),
                  });
                  if (res.ok) toast.success('Resumo único salvo!');
                  else toast.error('Falha ao salvar único.');
                } catch {
                  toast.error('Erro no resumo único.');
                }
              }}
              disabled={loading || !text.trim()}
            >
              {loading
                ? <><CircularProgress size={20} sx={{mr:1}}/>{loadingMessage}</>
                : 'Resumir'}
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* — exibição dos resumos */}
      {improved && (
        <Box mt={4}>
          <Box display="flex" alignItems="center" mb={1}>
            <Typography variant="h6" sx={{ flexGrow:1 }}>Resumo:</Typography>
            <Button size="small" variant="outlined" onClick={()=>setShowBothVersions(!showBothVersions)}>
              {showBothVersions ? 'Ocultar Original':'Mostrar Ambos'}
            </Button>
          </Box>

          {showBothVersions && (
            <Paper sx={{p:2, mb:2, bgcolor:'#f5f5f5'}}>
              <Typography variant="subtitle2" color="textSecondary">Versão inicial:</Typography>
              <Typography sx={{whiteSpace:'pre-wrap'}}>{summary}</Typography>
            </Paper>
          )}

          <Paper sx={{p:2, minHeight:'100px'}}>
            {showBothVersions && (
              <Typography variant="subtitle2" color="textSecondary">Versão final:</Typography>
            )}
            <Typography sx={{whiteSpace:'pre-wrap'}} onMouseUp={handleTextSelection}>
              {improved}
            </Typography>

            {selectedText && (
              <Box mt={2} p={1} border="1px dashed #ccc" borderRadius={1}>
                <Typography variant="body2" color="textSecondary">Trecho selecionado:</Typography>
                <Typography variant="body2" fontStyle="italic">"{selectedText}"</Typography>
                <Box mt={1} display="flex" gap={1}>
                  <Button size="small" variant="outlined" onClick={()=>{/* ... */}}>Melhorar trecho</Button>
                  <Button size="small" onClick={()=>setSelectedText('')}>Cancelar</Button>
                </Box>
              </Box>
            )}
          </Paper>

          <Box mt={1} display="flex" justifyContent="center">
            <Button
              variant="outlined"
              onClick={()=>navigator.clipboard.writeText(improved).then(()=>toast.success('Copiado!'))}
            >
              Copiar Resumo
            </Button>
          </Box>
        </Box>
      )}

      <ToastContainer position="top-right" autoClose={3000}/>
    </Container>
  );
}
