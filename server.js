import express from 'express';
import { createClient } from '@supabase/supabase-js';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Initialize Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// POST /api/orders - create a new order
app.post('/api/orders', async (req, res) => {
  try {
    const { customer_name, phone, address, delivery_time, items, total, delivery_fee, who, age, theme, lang } = req.body;
    
    if (!customer_name || !phone || !address || !items || !total) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const { data, error } = await supabase
      .from('orders')
      .insert([
        {
          customer_name,
          phone,
          address,
          delivery_time: delivery_time || null,
          items: JSON.stringify(items),
          total,
          delivery_fee,
          party_for: who,
          age: age ? parseInt(age) : null,
          theme,
          language: lang,
          status: 'pending',
          created_at: new Date().toISOString()
        }
      ])
      .select();

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({ error: 'Failed to create order' });
    }

    res.json({ success: true, order_id: data[0].id });
  } catch (e) {
    console.error('Server error:', e);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/orders - list all orders (with optional filter by status)
app.get('/api/orders', async (req, res) => {
  try {
    const { status } = req.query;
    let query = supabase.from('orders').select('*').order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch orders' });
    }

    res.json({ orders: data });
  } catch (e) {
    console.error('Server error:', e);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/orders/:id - get a single order
app.get('/api/orders/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json({ order: data });
  } catch (e) {
    console.error('Server error:', e);
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/orders/:id - update order status
app.patch('/api/orders/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !['pending', 'confirmed', 'packed', 'on_the_way', 'delivered'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const { data, error } = await supabase
      .from('orders')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select();

    if (error || !data || data.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json({ success: true, order: data[0] });
  } catch (e) {
    console.error('Server error:', e);
    res.status(500).json({ error: 'Server error' });
  }
});

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'Soirée backend is running' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Soirée backend listening on port ${PORT}`);
});
