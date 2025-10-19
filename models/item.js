const db = require('../db').db;

module.exports = {
    getItemById: (id, callback) => {
        db.get('SELECT * FROM items WHERE id = ?', [id], callback);
    },

    getAllItems: (callback) => {
        db.all('SELECT * FROM items', callback);
    },

    addItem: (item, callback) => {
        const { name, description, quantity, acquisition_date, serial_number, inventory_number, status, location_id, item_type_id, responsible_employee } = item;
        const stmt = db.prepare('INSERT INTO items (name, description, quantity, acquisition_date, serial_number, inventory_number, status, location_id, item_type_id, responsible_employee) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
        stmt.run(name, description, quantity, acquisition_date, serial_number, inventory_number, status, location_id, item_type_id, responsible_employee, function(err) {
            if (err) {
                callback(err);
            } else {
                callback(null, { id: this.lastID, ...item });
            }
        });
        stmt.finalize();
    },

    updateItem: (id, item, callback) => {
        const { name, description, quantity, acquisition_date, serial_number, status, location_id, item_type_id, inventory_number, responsible_employee } = item;
        const stmt = db.prepare('UPDATE items SET name = ?, description = ?, quantity = ?, acquisition_date = ?, serial_number = ?, status = ?, location_id = ?, item_type_id = ?, inventory_number = ?, responsible_employee = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
        stmt.run(name, description, quantity, acquisition_date, serial_number, status, location_id, item_type_id, inventory_number, responsible_employee, id, function(err) {
            if (err) {
                callback(err);
            } else {
                callback(null, { id: id, ...item });
            }
        });
        stmt.finalize();
    },

    deleteItem: (id, callback) => {
        db.run('DELETE FROM items WHERE id = ?', [id], callback);
    }
};