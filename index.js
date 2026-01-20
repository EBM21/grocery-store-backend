const express = require('express');
const cors = require('cors');
const pool = require('./db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

require('dotenv').config();

const app = express();

// --- SMART URL SETUP ---
// Agar process.env.BASE_URL set hai to wo use karo, warna localhost
const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';

// Middleware
app.use(cors());
app.use(express.json());

// --- IMAGE UPLOAD SETUP ---
const uploadDir = 'uploads';
if (!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/') 
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname) 
  }
});

const upload = multer({ storage: storage });

app.use('/uploads', express.static('uploads'));

// --- ROUTES ---

// 1. Test Route
app.get('/', (req, res) => {
    res.send("Backend is Running!");
});

// 2. GET ALL PRODUCTS
app.get('/products', async (req, res) => {
    try {
        const allProducts = await pool.query('SELECT * FROM products ORDER BY id DESC');
        res.json(allProducts.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

// 3. GET ALL CATEGORIES
app.get('/categories', async (req, res) => {
    try {
        const allCats = await pool.query('SELECT * FROM categories ORDER BY id ASC');
        res.json(allCats.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

// 4. ADD CATEGORY
app.post('/categories', upload.single('image'), async (req, res) => {
  try {
    const { name, discount_percent } = req.body;
    // CHANGE: Localhost ki jagah BASE_URL use kiya
    const image_url = req.file ? `${BASE_URL}/uploads/${req.file.filename}` : null;
    
    const newCat = await pool.query(
      "INSERT INTO categories (name, discount_percent, image_url) VALUES ($1, $2, $3) RETURNING *",
      [name, discount_percent || 0, image_url]
    );
    res.json(newCat.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});

// 5. ADD PRODUCT (Merged & Fixed)
app.post('/products', upload.single('image'), async (req, res) => {
  try {
    const { title, price, original_price, discount_tag, category_id, stock_quantity, description } = req.body;
    // CHANGE: Localhost ki jagah BASE_URL use kiya
    const image_url = req.file ? `${BASE_URL}/uploads/${req.file.filename}` : null;

    const newProduct = await pool.query(
      `INSERT INTO products (title, price, original_price, discount_tag, image_url, category_id, stock_quantity, description) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [
        title, 
        price, 
        original_price || null, 
        discount_tag || null, 
        image_url, 
        category_id ? parseInt(category_id) : null, 
        stock_quantity || 0,
        description || ""
      ]
    );
    
    res.json(newProduct.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error: " + err.message);
  }
});

// 6. DELETE PRODUCT
app.delete('/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query("DELETE FROM products WHERE id = $1", [id]);
    res.json({ message: "Product Deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});

// 7. DELETE CATEGORY
app.delete('/categories/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query("DELETE FROM categories WHERE id = $1", [id]);
    res.json({ message: "Category Deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});

// --- SLIDER ROUTES ---
app.get('/sliders', async (req, res) => {
    try {
        const slides = await pool.query('SELECT * FROM sliders ORDER BY id DESC');
        res.json(slides.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

// ADD SLIDER
app.post('/sliders', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
        return res.status(400).json({ msg: "Please upload an image" });
    }
    // CHANGE: Localhost ki jagah BASE_URL use kiya
    const image_url = `${BASE_URL}/uploads/${req.file.filename}`;
    
    const newSlide = await pool.query(
      "INSERT INTO sliders (image_url) VALUES ($1) RETURNING *",
      [image_url]
    );
    res.json(newSlide.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});

// DELETE SLIDER
app.delete('/sliders/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query("DELETE FROM sliders WHERE id = $1", [id]);
    res.json({ message: "Slider Deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});

// --- GET PRODUCTS BY CATEGORY ---
app.get('/products/category/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const products = await pool.query("SELECT * FROM products WHERE category_id = $1", [id]);
    res.json(products.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// --- ORDERS ROUTES ---
app.post('/orders', async (req, res) => {
  try {
    const { name, phone, address, city, total_amount, items } = req.body;
    const newOrder = await pool.query(
      "INSERT INTO orders (customer_name, phone, address, city, total_amount, items) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
      [name, phone, address, city, total_amount, JSON.stringify(items)]
    );
    res.json(newOrder.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// UPDATE ORDER STATUS
app.put('/orders/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    await pool.query("UPDATE orders SET status = $1 WHERE id = $2", [status, id]);
    res.json({ message: "Order updated" });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});

// DELETE ORDER
app.delete('/orders/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query("DELETE FROM orders WHERE id = $1", [id]);
    res.json({ message: "Order deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});

// GET ALL ORDERS
app.get('/orders', async (req, res) => {
  try {
    const allOrders = await pool.query("SELECT * FROM orders ORDER BY id DESC");
    res.json(allOrders.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// --- PROMO BAR ROUTES ---
app.get('/promo', async (req, res) => {
  try {
    const promo = await pool.query("SELECT * FROM promo_settings WHERE id = 1");
    res.json(promo.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});

app.put('/promo', async (req, res) => {
  try {
    const { message, end_time, is_active } = req.body;
    await pool.query(
      "UPDATE promo_settings SET message = $1, end_time = $2, is_active = $3 WHERE id = 1",
      [message, end_time, is_active]
    );
    res.json({ message: "Promo updated" });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});