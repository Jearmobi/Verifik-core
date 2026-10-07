const express = require('express');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 10000;

// Middleware para procesar datos JSON y de formularios
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middleware para desactivar caché en navegadores
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
});

// Servir archivos estáticos desde la carpeta /public
app.use(express.static(path.join(__dirname, 'public')));

// Inicializar cliente de Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// ==========================================
// 🚀 ENDPOINT API: REGISTRO DE COMERCIOS
// ==========================================
app.post('/api/register', async (req, res) => {
  try {
    const {
      tienda,
      rif,
      propietario,
      telefono,
      direccion,
      categoria,
      instagram,
      banco_pago,
      cedula_pago,
      telefono_pago,
      latitud,
      longitud,
      plan_id
    } = req.body;

    // Validación básica de campos requeridos
    if (!tienda || !rif || !telefono) {
      return res.status(400).json({
        success: false,
        message: 'Los campos Tienda, RIF y Teléfono son obligatorios.'
      });
    }

    // Insertar en la tabla public.merchants
    const { data, error } = await supabase
      .from('merchants')
      .insert([
        {
          tienda,
          rif,
          propietario: propietario || null,
          telefono: telefono || null,
          direccion: direccion || null,
          categoria: categoria || 'General',
          instagram: instagram || null,
          banco_pago_r: banco_pago || null,
          cedula_pago_r: cedula_pago || null,
          telefono_pa: telefono_pago || null,
          latitud: latitud ? parseFloat(latitud) : null,
          longitud: longitud ? parseFloat(longitud) : null,
          plan_id: plan_id || 'basico',
          nivel_verificacion: 1,
          estado: 'activo'
        }
      ])
      .select();

    if (error) {
      console.error('Error de Supabase:', error);
      return res.status(400).json({ success: false, message: error.message });
    }

    return res.status(201).json({
      success: true,
      message: 'Comercio registrado exitosamente',
      data: data[0]
    });

  } catch (err) {
    console.error('Error interno del servidor:', err);
    return res.status(500).json({ success: false, message: 'Error interno en el servidor' });
  }
});

// ==========================================
// 🌐 RUTAS DE VISTAS HTML
// ==========================================
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

app.get('/client-verify', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'client-verify.html'));
});

app.get('/verify', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'verify.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Iniciar Servidor
app.listen(PORT, () => {
  console.log(`🛡️ Servidor Verifik Shield activo en el puerto ${PORT}`);
});