const db = require('../db').db;

module.exports = {
    getLocationById: (id, callback) => {
        db.get('SELECT * FROM locations WHERE id = ?', [id], callback);
    },

    getAllLocations: (callback) => {
        db.all('SELECT * FROM locations ORDER BY name', [], callback);
    },

    addLocation: (location, callback) => {
        const { name, description } = location;
        const stmt = db.prepare('INSERT INTO locations (name, description) VALUES (?, ?)');
        stmt.run(name, description, function(err) {
            if (err) {
                callback(err);
            } else {
                callback(null, { id: this.lastID, ...location });
            }
        });
        stmt.finalize();
    },

    updateLocation: (id, location, callback) => {
        const { name, description } = location;
        const stmt = db.prepare('UPDATE locations SET name = ?, description = ? WHERE id = ?');
        stmt.run(name, description, id, function(err) {
            if (err) {
                callback(err);
            } else {
                callback(null, { id: id, ...location });
            }
        });
        stmt.finalize();
    },

    deleteLocation: (id, callback) => {
        db.run('DELETE FROM locations WHERE id = ?', [id], callback);
    }
};