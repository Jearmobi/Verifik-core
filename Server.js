const express = require('express');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const speakeasy = require('speakeasy');
require('dotenv').config();

const app = express();

// Middleware para procesar JSON y datos de formulario
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos desde la carpeta 'public'
app.use(express.static(path.join(__dirname, 'public')));

// Inicializar cliente de Supabase (Limpia espacios y comillas accidentales)
const supabaseUrl = (process.env.SUPABASE_URL || '').replace(/['"]/g, '').trim();
const supabaseKey = (process.env.SUPABASE_KEY || '').replace(/['"]/g, '').trim();

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
});

// --- RUTAS DE NAVEGACIÓN ---

// Redirigir raíz al registro
app.get('/', (req, res) => {
  res.redirect('/register');
});

// Servir la página de Registro HTML
app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

// Servir la página de Verificación HTML
app.get('/verify', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'verify.html'));
});

// --- API ENDPOINTS ---

// 1. Registro de Comercios
app.post(['/api/register', '/api/merchants/register'], async (req, res) => {
  try {
    const { id, tienda, rif, colorMarca, categoria, propietario, telefono, direccion } = req.body;

    const finalId = id || req.body.slug || req.body.identificador;
    const finalTienda = tienda || req.body.nombre || req.body.nombreComercio;
    const finalRif = rif || req.body.rifComercio;

    if (!finalId || !finalTienda || !finalRif) {
      return res.status(400).json({ 
        exito: false, 
        mensaje: 'El Identificador (Slug), Nombre y RIF son obligatorios' 
      });
    }

    const secret = speakeasy.generateSecret({ length: 20 }).base32;

    const { data, error } = await supabase
      .from('merchants')
      .upsert({
        id: finalId,
        tienda: finalTienda,
        rif: finalRif,
        secret: secret,
        color_marca: colorMarca || '#2563eb',
        categoria: categoria || 'General',
        propietario: propietario || 'No especificado',
        telefono: telefono || 'No especificado',
        direccion: direccion || 'Maturín, Monagas'
      });

    if (error) {
      console.error('Error detallado de Supabase:', error);
      return res.status(500).json({ 
        exito: false, 
        mensaje: `Error Supabase: ${error.message} (Código: ${error.code})` 
      });
    }

    res.json({
      exito: true,
      mensaje: 'Comercio registrado con éxito',
      tiendaId: finalId
    });
  } catch (err) {
    console.error('Excepción en servidor:', err);
    res.status(500).json({ 
      exito: false, 
      mensaje: `Excepción del Servidor: ${err.message}` 
    });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Servidor Verifik corriendo en puerto ${PORT}`);
});