const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql');
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const session = require('express-session');
const Razorpay = require('razorpay');


const app = express();
const port = 8080;
const razorpay = new Razorpay({
    key_id: 'rzp_test_nKOF0JuHBBkse8',
    key_secret: 'CJz84d8yuKeer7YQgAPJoATH'
});


// Middleware
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
    secret: 'secret', // Change this to a random secret key
    resave: false,
    saveUninitialized: false
}));

// Database connection
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Pr@mit2000',
    database: 'my_database'
});

db.connect((err) => {
    if (err) {
        throw err;
    }
    console.log('Connected to MySQL database');
});


// User Authentication Middleware
function authenticateToken(req, res, next) {
    const token = req.session.token;
    if (!token) return res.sendStatus(401);

    jwt.verify(token, 'your-secret-key', (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
}

// Get User Name Route
app.get('/getUserName', authenticateToken, (req, res) => {
    const userId = req.user.id;

    db.query('SELECT name FROM users WHERE id = ?', [userId], (err, results) => {
        if (err) {
            res.status(500).send('Failed to fetch user name');
            throw err;
        }
        if (results.length > 0) {
            const userName = results[0].name;
            res.status(200).json({ name: userName });
        } else {
            res.status(404).send('User not found');
        }
    });
});

// Signup Route
app.post('/signup', async (req, res) => {
    const { name, email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    db.query('INSERT INTO users (name, email, password) VALUES (?, ?, ?)', [name, email, hashedPassword], (err, result) => {
        if (err) {
            res.status(500).send('Failed to sign up');
            throw err;
        }
        res.status(200).send('User signed up successfully');
    });
});

// Login Route
app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    db.query('SELECT * FROM users WHERE email = ?', [email], async (err, results) => {
        if (err) {
            res.status(500).send('Failed to log in');
            throw err;
        }

        if (results.length > 0) {
            const user = results[0];
            const match = await bcrypt.compare(password, user.password);
            if (match) {
                const token = jwt.sign({ id: user.id }, 'your-secret-key'); // Change this secret key
                req.session.token = token;
                res.status(200).send('Login successful');
            } else {
                res.status(401).send('Incorrect email or password');
            }
        } else {
            res.status(401).send('Incorrect email or password');
        }
    });
});

// Logout Route
app.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            res.status(500).send('Failed to logout');
            throw err;
        }
        res.status(200).send('Logged out successfully');
    });
});

// Add Expense Route
app.post('/addExpense', authenticateToken, (req, res) => {
    const userId = req.user.id;
    const { amount, description, category } = req.body;

    db.query('INSERT INTO expenses (user_id, amount, description, category) VALUES (?, ?, ?, ?)', [userId, amount, description, category], (err, result) => {
        if (err) {
            res.status(500).send('Failed to add expense');
            throw err;
        }
        res.status(200).send('Expense added successfully');
    });
});

// Delete Expense Route
app.delete('/deleteExpense/:id', authenticateToken, (req, res) => {
    const expenseId = req.params.id;
    const userId = req.user.id;

    db.query('DELETE FROM expenses WHERE id = ? AND user_id = ?', [expenseId, userId], (err, result) => {
        if (err) {
            res.status(500).send('Failed to delete expense');
            throw err;
        }
        if (result.affectedRows === 0) {
            res.status(403).send('You are not authorized to delete this expense');
        } else {
            res.status(200).send('Expense deleted successfully');
        }
    });
});

// Get Expenses Route
app.get('/getExpenses', authenticateToken, (req, res) => {
    const userId = req.user.id;

    db.query('SELECT * FROM expenses WHERE user_id = ?', [userId], (err, results) => {
        if (err) {
            res.status(500).send('Failed to fetch expenses');
            throw err;
        }
        res.status(200).json(results);
    });
});


// Create Order Route
app.post('/createOrder', authenticateToken, async (req, res) => {
    const amount = 50000; // Amount in smallest currency unit (e.g., paise for INR)
    const currency = 'INR';
    const receipt = 'order_rcptid_' + Math.floor(Math.random() * 1000); // Generate a random receipt ID

    const options = {
        amount: amount,
        currency: currency,
        receipt: receipt
    };

    try {
        const order = await razorpay.orders.create(options);
        res.status(200).json(order);
    } catch (error) {
        console.error('Failed to create order:', error);
        res.status(500).send('Failed to create order');
    }
});

// Update Order Status Route (on successful payment)
app.post('/updateOrderStatus', authenticateToken, async (req, res) => {
    const orderId = req.body.orderId;
    const userId = req.user.id;

    try {
        // Handle successful payment logic here
        res.status(200).send('Order status updated successfully');
    } catch (error) {
        console.error('Failed to update order status:', error);
        res.status(500).send('Failed to update order status');
    }
});

// Update Order Status Route (on failed payment)
app.post('/updateOrderStatusFailed', authenticateToken, async (req, res) => {
    const orderId = req.body.orderId;
    const userId = req.user.id;

    try {
        // Handle failed payment logic here
        res.status(200).send('Order status updated successfully');
    } catch (error) {
        console.error('Failed to update order status:', error);
        res.status(500).send('Failed to update order status');
    }
});



// Start server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});