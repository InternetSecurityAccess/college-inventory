const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database.db');
const db = new sqlite3.Database(dbPath);

// Функция для очистки и заполнения базы данных демо-данными
function populateDemoData() {
    console.log('Начало заполнения базы данных демо-данными...');

    // Очищаем существующие данные (осторожно!)
    db.serialize(() => {
        // Удаляем существующие данные
        db.run('DELETE FROM equipment_movements');
        db.run('DELETE FROM equipment');
        db.run('DELETE FROM classrooms');
        db.run('DELETE FROM equipment_types');

        // Сбрасываем автоинкремент
        db.run('DELETE FROM sqlite_sequence WHERE name IN ("equipment_types", "classrooms", "equipment", "equipment_movements")');

        // Добавляем типы оборудования
        const equipmentTypes = [
            'Компьютер',
            'Монитор', 
            'МФУ',
            'Принтер',
            'Проектор',
            'Ноутбук',
            'Сервер',
            'Сетевое оборудование',
            'Стул',
            'Стол',
            'Шкаф',
            'Доска интерактивная'
        ];

        const typeStmt = db.prepare('INSERT INTO equipment_types (name) VALUES (?)');
        equipmentTypes.forEach(type => {
            typeStmt.run(type);
        });
        typeStmt.finalize();

        // Добавляем аудитории
        const classrooms = [
            { floor: 1, name: '101', description: 'Компьютерный класс', is_service: 0 },
            { floor: 1, name: '102', description: 'Лаборатория информатики', is_service: 0 },
            { floor: 1, name: '103', description: 'Лекционная аудитория', is_service: 0 },
            { floor: 1, name: '104', description: 'Кабинет физики', is_service: 0 },
            { floor: 2, name: '201', description: 'Компьютерный класс', is_service: 0 },
            { floor: 2, name: '202', description: 'Лаборатория робототехники', is_service: 0 },
            { floor: 2, name: '203', description: 'Лекционная аудитория', is_service: 0 },
            { floor: 3, name: '301', description: 'Серверная', is_service: 1 },
            { floor: 3, name: '302', description: 'Кабинет администрации', is_service: 1 },
            { floor: 3, name: '303', description: 'Преподавательская', is_service: 1 },
            { floor: 3, name: '304', description: 'Склад', is_service: 1 }
        ];

        const classroomStmt = db.prepare('INSERT INTO classrooms (floor, name, description, is_service) VALUES (?, ?, ?, ?)');
        classrooms.forEach(classroom => {
            classroomStmt.run([classroom.floor, classroom.name, classroom.description, classroom.is_service]);
        });
        classroomStmt.finalize();

        // Добавляем оборудование
        const equipment = [
            // Компьютеры в классе 101
            { name: 'Компьютер преподавателя', type_id: 1, inventory_number: 'PC-TEACH-001', serial_number: 'SN-PC-001', classroom_id: 1, quantity: 1, status: 'active' },
            { name: 'Компьютер студенческий', type_id: 1, inventory_number: 'PC-STUD-101-01', serial_number: 'SN-PC-101-01', classroom_id: 1, quantity: 1, status: 'active' },
            { name: 'Компьютер студенческий', type_id: 1, inventory_number: 'PC-STUD-101-02', serial_number: 'SN-PC-101-02', classroom_id: 1, quantity: 1, status: 'active' },
            { name: 'Компьютер студенческий', type_id: 1, inventory_number: 'PC-STUD-101-03', serial_number: 'SN-PC-101-03', classroom_id: 1, quantity: 1, status: 'active' },
            
            // Мониторы в классе 101
            { name: 'Монитор Dell 24"', type_id: 2, inventory_number: 'MON-101-01', serial_number: 'SN-MON-101-01', classroom_id: 1, quantity: 1, status: 'active' },
            { name: 'Монитор Dell 24"', type_id: 2, inventory_number: 'MON-101-02', serial_number: 'SN-MON-101-02', classroom_id: 1, quantity: 1, status: 'active' },
            
            // МФУ и принтеры
            { name: 'МФУ HP LaserJet', type_id: 3, inventory_number: 'MFP-001', serial_number: 'SN-MFP-001', classroom_id: 2, quantity: 1, status: 'active' },
            { name: 'Принтер Canon', type_id: 4, inventory_number: 'PRN-001', serial_number: 'SN-PRN-001', classroom_id: 3, quantity: 1, status: 'active' },
            
            // Проекторы
            { name: 'Проектор Epson', type_id: 5, inventory_number: 'PROJ-001', serial_number: 'SN-PROJ-001', classroom_id: 3, quantity: 1, status: 'active' },
            { name: 'Проектор BenQ', type_id: 5, inventory_number: 'PROJ-002', serial_number: 'SN-PROJ-002', classroom_id: 5, quantity: 1, status: 'repair' },
            
            // Ноутбуки
            { name: 'Ноутбук Dell Latitude', type_id: 6, inventory_number: 'NB-001', serial_number: 'SN-NB-001', classroom_id: 6, quantity: 1, status: 'active' },
            { name: 'Ноутбук HP ProBook', type_id: 6, inventory_number: 'NB-002', serial_number: 'SN-NB-002', classroom_id: 11, quantity: 1, status: 'active' },
            
            // Серверное оборудование
            { name: 'Сервер Dell PowerEdge', type_id: 7, inventory_number: 'SRV-001', serial_number: 'SN-SRV-001', classroom_id: 8, quantity: 1, status: 'active' },
            { name: 'Коммутатор Cisco', type_id: 8, inventory_number: 'SW-001', serial_number: 'SN-SW-001', classroom_id: 8, quantity: 1, status: 'active' },
            
            // Мебель в классе 101
            { name: 'Стул компьютерный', type_id: 9, inventory_number: null, serial_number: null, classroom_id: 1, quantity: 25, status: 'active' },
            { name: 'Стол компьютерный', type_id: 10, inventory_number: null, serial_number: null, classroom_id: 1, quantity: 15, status: 'active' },
            { name: 'Шкаф для документов', type_id: 11, inventory_number: 'FURN-001', serial_number: null, classroom_id: 1, quantity: 2, status: 'active' },
            
            // Мебель в классе 201
            { name: 'Стул компьютерный', type_id: 9, inventory_number: null, serial_number: null, classroom_id: 5, quantity: 20, status: 'active' },
            { name: 'Стол компьютерный', type_id: 10, inventory_number: null, serial_number: null, classroom_id: 5, quantity: 12, status: 'active' },
            
            // Интерактивные доски
            { name: 'Доска интерактивная Smart', type_id: 12, inventory_number: 'IB-001', serial_number: 'SN-IB-001', classroom_id: 3, quantity: 1, status: 'active' },
            { name: 'Доска интерактивная Promethean', type_id: 12, inventory_number: 'IB-002', serial_number: 'SN-IB-002', classroom_id: 5, quantity: 1, status: 'broken' },
            
            // Оборудование в ремонте (хранится на складе)
            { name: 'Компьютер студенческий', type_id: 1, inventory_number: 'PC-STUD-101-04', serial_number: 'SN-PC-101-04', classroom_id: 11, quantity: 1, status: 'repair' },
            { name: 'Монитор LG', type_id: 2, inventory_number: 'MON-REP-001', serial_number: 'SN-MON-REP-001', classroom_id: 11, quantity: 1, status: 'repair' },
            
            // Списанное оборудование (хранится на складе)
            { name: 'Компьютер устаревший', type_id: 1, inventory_number: 'PC-OLD-001', serial_number: 'SN-PC-OLD-001', classroom_id: 11, quantity: 1, status: 'written_off' }
        ];

        const equipmentStmt = db.prepare(`
            INSERT INTO equipment 
            (name, type_id, inventory_number, serial_number, classroom_id, quantity, status) 
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `);

        equipment.forEach(item => {
            equipmentStmt.run([
                item.name,
                item.type_id,
                item.inventory_number,
                item.serial_number,
                item.classroom_id,
                item.quantity,
                item.status
            ], function(err) {
                if (err) {
                    console.error('Ошибка при добавлении оборудования:', err);
                    console.error('Данные:', item);
                }
            });
        });
        equipmentStmt.finalize();

        // Добавляем историю перемещений
        const movements = [
            { equipment_id: 2, from_classroom_id: null, to_classroom_id: 1, movement_reason: 'Первоначальное размещение' },
            { equipment_id: 3, from_classroom_id: null, to_classroom_id: 1, movement_reason: 'Первоначальное размещение' },
            { equipment_id: 4, from_classroom_id: null, to_classroom_id: 1, movement_reason: 'Первоначальное размещение' },
            { equipment_id: 8, from_classroom_id: 1, to_classroom_id: 2, movement_reason: 'Перемещение для удобства преподавателей' },
            { equipment_id: 9, from_classroom_id: 1, to_classroom_id: 3, movement_reason: 'Для проведения лекций' },
            { equipment_id: 10, from_classroom_id: 3, to_classroom_id: 5, movement_reason: 'Замена неисправного проектора' },
            { equipment_id: 21, from_classroom_id: 1, to_classroom_id: 11, movement_reason: 'Передан в ремонт (временное хранение на складе)' },
            { equipment_id: 22, from_classroom_id: 2, to_classroom_id: 11, movement_reason: 'Неисправность матрицы (временное хранение на складе)' }
        ];

        const movementStmt = db.prepare(`
            INSERT INTO equipment_movements 
            (equipment_id, from_classroom_id, to_classroom_id, movement_reason) 
            VALUES (?, ?, ?, ?)
        `);

        movements.forEach(movement => {
            movementStmt.run([
                movement.equipment_id,
                movement.from_classroom_id,
                movement.to_classroom_id,
                movement.movement_reason
            ], function(err) {
                if (err) {
                    console.error('Ошибка при добавлении перемещения:', err);
                    console.error('Данные:', movement);
                }
            });
        });
        movementStmt.finalize();

        console.log('Демо-данные успешно добавлены!');
        console.log('==============================');
        console.log('Создано:');
        console.log('- Типов оборудования: ' + equipmentTypes.length);
        console.log('- Аудиторий: ' + classrooms.length);
        console.log('- Единиц оборудования: ' + equipment.length);
        console.log('- Записей в истории перемещений: ' + movements.length);
        console.log('==============================');

        // Показываем примеры данных
        db.all('SELECT name FROM equipment_types', (err, types) => {
            if (!err) {
                console.log('Типы оборудования:', types.map(t => t.name).join(', '));
            }
        });

        db.all('SELECT floor, name, description FROM classrooms LIMIT 5', (err, rooms) => {
            if (!err) {
                console.log('Примеры аудиторий:');
                rooms.forEach(room => {
                    console.log(`  ${room.floor} этаж - ${room.name}: ${room.description}`);
                });
            }
        });

        db.all('SELECT name, inventory_number, quantity FROM equipment WHERE quantity > 1', (err, multiItems) => {
            if (!err && multiItems.length > 0) {
                console.log('Групповое оборудование:');
                multiItems.forEach(item => {
                    console.log(`  ${item.name}: ${item.quantity} шт. ${item.inventory_number ? '(инв.: ' + item.inventory_number + ')' : ''}`);
                });
            }
        });
    });
}

// Запускаем заполнение
populateDemoData();

// Закрываем соединение с БД
setTimeout(() => {
    db.close();
    console.log('База данных закрыта.');
    process.exit(0);
}, 3000);