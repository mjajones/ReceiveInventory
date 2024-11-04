const express = require('express');
const mysql = require('mysql2/promise'); // Importing promise-based mysql

const app = express();
const port = 8000;
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database connection
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root', 
    password: 'Oneofus0548!', 
    database: 'xplosiveelectronics',
});

connection.then(() => {
    console.log('Connected to MySQL database!');
}).catch((err) => {
    console.error('Error connecting to database:', err);
});

// Serve static files
app.use(express.static(__dirname));

// API endpoint for getting products (with autocomplete)
app.get('/api/products', async (req, res) => {
    try {
        const searchTerm = req.query.term ? `%${req.query.term}%` : '%';
        const [results] = await (await connection).query(`
            SELECT Name 
            FROM product
            WHERE Name LIKE ?
        `, [searchTerm]);
        res.json(results);
    } catch (err) {
        console.error('Error fetching products:', err);
        res.status(500).json({ error: 'Failed to fetch products' });
    }
});

// API endpoint for receiving inventory
app.post('/api/receive-inventory', async (req, res) => {
    try {
        const { products } = req.body;
        const locationId = 4; // North Warehouse

        const updateInventoryPromises = products.map(async (product) => {
            const [productResult] = await (await connection).query(`SELECT Product_ID FROM product WHERE Name = ?`, [product.productName]);
            if (productResult.length === 0) {
                throw new Error(`Product not found: ${product.productName}`);
            }
            const productId = productResult[0].Product_ID;
            await (await connection).query(`
                UPDATE inventory 
                SET Quantity = Quantity + ? 
                WHERE Product_ID = ? AND Location_ID = ?
            `, [product.quantity, productId, locationId]);
        });

        await Promise.all(updateInventoryPromises);
        res.json({ message: 'Inventory updated successfully!' });
    } catch (err) {
        console.error('Error updating inventory:', err);
        res.status(500).json({ message: 'Error updating inventory: ' + err.message });
    }
});

// API endpoint for submitting transfers
app.post('/api/submit-transfer', async (req, res) => {
    try {
        const { invoiceOrderDate, invoiceReceivedDate, invoiceNumber, toLocationId, products } = req.body;

        // Insert into the transfer table
        const fromLocationId = 5;
        const [transferResult] = await (await connection).query(`
            INSERT INTO transfer (From_Location_ID, To_Location_ID, Transfer_Date) 
            VALUES (?, ?, NOW())
        `, [fromLocationId, toLocationId]);

        const transferId = transferResult.insertId;

        // Insert into the transfer_detail table
        const transferDetailPromises = products.map(async (product) => {
            const [productResult] = await (await connection).query(`SELECT Product_ID FROM product WHERE Name = ?`, [product.productName]);
            if (productResult.length === 0) {
                throw new Error(`Product not found: ${product.productName}`);
            }
            const productId = productResult[0].Product_ID;
            await (await connection).query(`
                INSERT INTO transfer_detail (Transfer_ID, Product_ID, Quantity) 
                VALUES (?, ?, ?)
            `, [transferId, productId, product.quantity]);

            // Sub quantity from N WH
            await (await connection).query(`
                UPDATE inventory
                SET Quantity = Quantity - ?
                WHERE Product_ID = ? AND Location_ID = 4
            `, [product.quantity, productId]);

            // Add quantity to transferred location
            await (await connection).query(`
                UPDATE inventory
                SET Quantity = Quantity + ?
                WHERE Product_ID = ? AND Location_ID = ?
            `, [product.quantity, productId, toLocationId]);
        });

        await Promise.all(transferDetailPromises);
        res.json({ message: 'Transfer submitted successfully!' });
    } catch (err) {
        console.error('Error inserting into transfer_detail table:', err);
        res.status(500).json({ message: 'Error saving transfer details: ' + err.message });
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});