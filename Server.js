require('dotenv').config();
const express = require('express');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 10000;

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Servir Admin
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// API: Listar todos los comercios
app.get('/api/merchants', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('merchants')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) return res.status(400).json({ success: false, message: error.message });
    return res.json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
});

// API: Consulta pública de certificado (por parámetro o por path)
app.get('/api/verify', async (req, res) => {
  const queryId = req.query.id || req.query.tienda;
  if (!queryId) return res.status(400).json({ success: false, message: 'ID de tienda requerido' });
  return buscarComercio(queryId, res);
});

app.get('/api/verify/:tienda', async (req, res) => {
  return buscarComercio(req.params.tienda, res);
});

async function buscarComercio(termino, res) {
  try {
    const { data, error } = await supabase.from('merchants').select('*');
    if (error) return res.status(400).json({ success: false, message: error.message });

    const cleanInput = termino.toLowerCase().replace(/[\s-]+/g, '');

    const merchant = data.find(m => {
      if (!m.tienda) return false;
      const cleanTienda = m.tienda.toLowerCase().replace(/[\s-]+/g, '');
      return cleanTienda === cleanInput || m.id == termino;
    });

    if (!merchant) {
      return res.status(404).json({ success: false, message: 'Comercio no encontrado' });
    }

    return res.json({ success: true, data: merchant });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Error al verificar certificado' });
  }
}

// API: Actualizar comercio (Coordenadas / Nivel)
app.put('/api/merchants/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const { data, error } = await supabase
      .from('merchants')
      .update(req.body)
      .eq('id', id)
      .select();

    if (error) return res.status(400).json({ success: false, message: error.message });
    return res.json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Error al actualizar' });
  }
});

app.listen(PORT, () => {
  console.log(`Verifik Shield corriendo en puerto ${PORT}`);
});