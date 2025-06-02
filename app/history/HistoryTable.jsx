'use client';

import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TablePagination,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
} from '@mui/material';

// Quantos caracteres exibir no “preview” antes de truncar
const PREVIEW_LIMIT = 100;

export default function HistoryTable({ data }) {
  // Estados para paginação
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const handleChangePage = (_event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Estados para controlar qual diálogo está aberto e qual texto exibir
  const [openDialog, setOpenDialog] = useState(false);
  const [dialogTitle, setDialogTitle] = useState('');
  const [dialogContent, setDialogContent] = useState('');

  // Abre o Dialog com título e conteúdo passado
  const handleOpenDialog = (title, fullText) => {
    setDialogTitle(title);
    setDialogContent(fullText);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setDialogTitle('');
    setDialogContent('');
  };

  // Calcula quantas linhas “vazias” colocar no final para manter altura uniforme
  const emptyRows =
    page > 0 ? Math.max(0, (1 + page) * rowsPerPage - data.length) : 0;

  // Gera o preview truncado; se o texto for maior que o limite, adiciona “...”
  const renderPreview = (text) => {
    if (!text) return '';
    if (text.length <= PREVIEW_LIMIT) {
      return text;
    }
    return text.slice(0, PREVIEW_LIMIT) + '...';
  };

  return (
    <>
      <Paper sx={{ width: '100%', overflow: 'hidden' }}>
        <TableContainer sx={{ maxHeight: 600 }}>
          <Table stickyHeader aria-label="tabela-historico-resumos">
            <TableHead>
              <TableRow>
                <TableCell><strong>Data e Hora (SP)</strong></TableCell>
                <TableCell><strong>Texto Original</strong></TableCell>
                <TableCell><strong>Resumo Inicial</strong></TableCell>
                <TableCell><strong>Resumo Melhorado</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((row, index) => (
                  <TableRow hover key={index}>
                    {/* Coluna de timestamp */}
                    <TableCell
                      sx={{ whiteSpace: 'nowrap', fontFamily: 'monospace' }}
                    >
                      {row.timestamp}
                    </TableCell>

                    {/* Coluna Texto Original */}
                    <TableCell>
                      <Box display="flex" alignItems="start">
                        <Typography
                          component="span"
                          sx={{ whiteSpace: 'pre-wrap', flexGrow: 1 }}
                        >
                          {renderPreview(row.original_text)}
                        </Typography>
                        {row.original_text.length > PREVIEW_LIMIT && (
                          <Button
                            size="small"
                            onClick={() =>
                              handleOpenDialog('Texto Original', row.original_text)
                            }
                            sx={{ ml: 1 }}
                          >
                            Ver mais
                          </Button>
                        )}
                      </Box>
                    </TableCell>

                    {/* Coluna Resumo Inicial */}
                    <TableCell>
                      <Box display="flex" alignItems="start">
                        <Typography
                          component="span"
                          sx={{ whiteSpace: 'pre-wrap', flexGrow: 1 }}
                        >
                          {renderPreview(row.initial_summary)}
                        </Typography>
                        {row.initial_summary.length > PREVIEW_LIMIT && (
                          <Button
                            size="small"
                            onClick={() =>
                              handleOpenDialog('Resumo Inicial', row.initial_summary)
                            }
                            sx={{ ml: 1 }}
                          >
                            Ver mais
                          </Button>
                        )}
                      </Box>
                    </TableCell>

                    {/* Coluna Resumo Melhorado */}
                    <TableCell>
                      <Box display="flex" alignItems="start">
                        <Typography
                          component="span"
                          sx={{ whiteSpace: 'pre-wrap', flexGrow: 1 }}
                        >
                          {renderPreview(row.improved_summary)}
                        </Typography>
                        {row.improved_summary.length > PREVIEW_LIMIT && (
                          <Button
                            size="small"
                            onClick={() =>
                              handleOpenDialog('Resumo Melhorado', row.improved_summary)
                            }
                            sx={{ ml: 1 }}
                          >
                            Ver mais
                          </Button>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}

              {emptyRows > 0 && (
                <TableRow style={{ height: 53 * emptyRows }}>
                  <TableCell colSpan={4} />
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          component="div"
          count={data.length}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          labelRowsPerPage="Linhas por página"
          rowsPerPageOptions={[5, 10, 25, 50]}
        />
      </Paper>

      {/* Dialog genérico para exibir texto completo */}
      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>{dialogTitle}</DialogTitle>
        <DialogContent dividers sx={{ whiteSpace: 'pre-wrap' }}>
          {dialogContent}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Fechar</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
