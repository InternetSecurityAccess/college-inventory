const db = require('../db').db;

module.exports = {
    getItemTypeById: (id, callback) => {
        db.get('SELECT * FROM item_types WHERE id = ?', [id], callback);
    },

    getAllItemTypes: (callback) => {
        db.all('SELECT * FROM item_types ORDER BY name', [], callback);
    },

    addItemType: (itemType, callback) => {
        const { name, description } = itemType;
        const stmt = db.prepare('INSERT INTO item_types (name, description) VALUES (?, ?)');
        stmt.run(name, description, function(err) {
            if (err) {
                callback(err);
            } else {
                callback(null, { id: this.lastID, ...itemType });
            }
        });
        stmt.finalize();
    },

    updateItemType: (id, itemType, callback) => {
        const { name, description } = itemType;
        const stmt = db.prepare('UPDATE item_types SET name = ?, description = ? WHERE id = ?');
        stmt.run(name, description, id, function(err) {
            if (err) {
                callback(err);
            } else {
                callback(null, { id: id, ...itemType });
            }
        });
        stmt.finalize();
    },

    deleteItemType: (id, callback) => {
        db.run('DELETE FROM item_types WHERE id = ?', [id], callback);
    }
};