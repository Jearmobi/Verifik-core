require('dotenv').config();
const express = require('express');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 10000;

// Inicializar cliente de Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Servir la vista de admin
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Servir la vista de certificado público
app.get('/verify', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'verify.html'));
});

// API: Obtener todos los comercios
app.get('/api/merchants', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('merchants')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) return res.status(400).json({ success: false, message: error.message });
    return res.json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Error en el servidor' });
  }
});

// API: Consultar un certificado flexible (acepta slug o nombre exacto)
app.get('/api/verify/:tienda', async (req, res) => {
  const { tienda } = req.params;

  try {
    const { data, error } = await supabase.from('merchants').select('*');
    if (error) return res.status(400).json({ success: false, message: error.message });

    const cleanInput = tienda.toLowerCase().replace(/[\s-]+/g, '');

    const merchant = data.find(m => {
      if (!m.tienda) return false;
      const cleanTienda = m.tienda.toLowerCase().replace(/[\s-]+/g, '');
      return cleanTienda === cleanInput;
    });

    if (!merchant) {
      return res.status(404).json({ success: false, message: 'Comercio no encontrado' });
    }

    return res.json({ success: true, data: merchant });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Error interno al consultar certificado' });
  }
});

// API: Actualizar datos de un comercio (Coordenadas, Nivel, etc.)
app.put('/api/merchants/:id', async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  try {
    const { data, error } = await supabase
      .from('merchants')
      .update(updateData)
      .eq('id', id)
      .select();

    if (error) return res.status(400).json({ success: false, message: error.message });
    return res.json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Error al actualizar el comercio' });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor Verifik Shield corriendo en puerto ${PORT}`);
});