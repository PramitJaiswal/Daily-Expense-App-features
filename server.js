const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql');
const path = require('path');
const bcrypt = require('bcrypt'); // Import bcrypt for password hashing
const saltRounds = 10; // Number of salt rounds for bcrypt
const app = express();
const port = 8080;

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

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

// Serve the index.html file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Handle user signup
app.post('/signup', async (req, res) => {
    const { name, email, password } = req.body;

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    db.query('INSERT INTO users (name, email, password) VALUES (?, ?, ?)', [name, email, hashedPassword], (err, result) => {
        if (err) {
            res.status(500).send('Failed to sign up');
            throw err;
        }
        res.status(200).send('User signed up successfully');
    });
});

// Handle user login
app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    db.query('SELECT * FROM users WHERE email = ?', [email], async (err, results) => {
        if (err) {
            res.status(500).send('Failed to log in');
            throw err;
        }

        if (results.length > 0) {
            const user = results[0];
            // Compare the entered password with the hashed password stored in the database
            const match = await bcrypt.compare(password, user.password);
            if (match) {
                res.status(200).send('Login successful');
            } else {
                res.status(401).send('Incorrect email or password');
            }
        } else {
            res.status(401).send('Incorrect email or password');
        }
    });
});

// Serve the expense tracker page
app.get('/expenseTracker.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'expenseTracker.html'));
});

// Handle adding expense
app.post('/addExpense', (req, res) => {
    const { amount, description, category } = req.body;

    db.query('INSERT INTO expenses (amount, description, category) VALUES (?, ?, ?)', [amount, description, category], (err, result) => {
        if (err) {
            res.status(500).send('Failed to add expense');
            throw err;
        }
        res.status(200).send('Expense added successfully');
    });
});

// Handle deleting an expense
app.delete('/deleteExpense/:id', (req, res) => {
    const expenseId = req.params.id;

    db.query('DELETE FROM expenses WHERE id = ?', [expenseId], (err, result) => {
        if (err) {
            res.status(500).send('Failed to delete expense');
            throw err;
        }
        res.status(200).send('Expense deleted successfully');
    });
});

// Serve the expense list data
app.get('/getExpenses', (req, res) => {
    db.query('SELECT * FROM expenses', (err, results) => {
        if (err) {
            res.status(500).send('Failed to fetch expenses');
            throw err;
        }
        res.status(200).json(results);
    });
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
